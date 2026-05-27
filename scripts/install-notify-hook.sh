#!/bin/bash
# tmux-agent 通知 hook 安装向导 v2
#
# 一条龙搞定 WeCom + Lark 双 channel:
#   - 装 hook 脚本 + 注册 ~/.claude/settings.json
#   - 给 systemd unit 加 EnvironmentFile (无则补)
#   - 交互式配 WeCom (URL) + 立刻发测试消息验证
#   - 交互式配 Lark (app_id/secret), 自动测 token, 用企业邮箱反查 open_id,
#     立刻发测试卡片验证, 错误码翻译成"你应该回去做哪一步"
#   - 写 config.yaml + .env (secret chmod 600)
#   - 重启 service + 跟踪 5 秒 log 看 WS 是否真接上
#
# Usage:
#   ./scripts/install-notify-hook.sh                  # 交互式
#
# 自动化 (用于测试 / CI):
#   ./scripts/install-notify-hook.sh <<EOF
#   y                                                  # WeCom 启用
#   https://qyapi.weixin.qq.com/...                    # WeCom URL
#   y                                                  # Lark 启用
#   cli_xxx                                            # app_id
#   xxxxx                                              # app_secret
#   you@company.com                                    # email (脚本反查 open_id)
#   EOF
#
# Re-run 完全幂等. 任何 step 出错可 Ctrl-C, 修后再跑.

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE="$REPO_ROOT/docs/notify.sh"
HOOK_DIR="$HOME/.claude/hooks"
HOOK_SH="$HOOK_DIR/notify.sh"
SETTINGS="$HOME/.claude/settings.json"
TMUX_CFG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/tmux-agent"
TMUX_CFG="$TMUX_CFG_DIR/config.yaml"
TMUX_ENV="$TMUX_CFG_DIR/.env"
UNIT="$HOME/.config/systemd/user/tmux-agent.service"

mkdir -p "$HOOK_DIR" "$TMUX_CFG_DIR"

step()  { echo; echo "━━━ $* ━━━"; }
ok()    { echo "  ✓ $*"; }
warn()  { echo "  ⚠ $*"; }
err()   { echo "  ✗ $*" >&2; }
hint()  { echo "    → $*"; }

# ─────── Step 1: 依赖检查 ───────
step "[1/6] 依赖检查"
for bin in jq curl tmux python3; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    err "$bin 未安装"
    hint "Ubuntu: sudo apt install $bin"
    exit 1
  fi
done
if ! python3 -c "import yaml" >/dev/null 2>&1; then
  err "python3 缺 PyYAML"
  hint "pip install pyyaml  或  sudo apt install python3-yaml"
  exit 1
fi
ok "jq / curl / tmux / python3 (含 PyYAML) 都有"

# ─────── Step 2: 老 hook 迁移 + 装新 hook ───────
step "[2/6] 装新 hook (~/.claude/hooks/notify.sh)"
OLD_HOOK="$HOOK_DIR/notify_wechat.sh"
if [ -f "$OLD_HOOK" ]; then
  mv "$OLD_HOOK" "${OLD_HOOK}.bak"
  ok "老 notify_wechat.sh 备份到 .bak"
fi
cp "$TEMPLATE" "$HOOK_SH"
chmod +x "$HOOK_SH"
ok "$HOOK_SH"

# upsert KEY="value" 到 env 文件 (replace-in-place, 不堆重复行)
upsert_env() {
  local key="$1" val="$2" file="$3"
  touch "$file"
  grep -v "^$key=" "$file" > "$file.tmp" || true
  echo "$key=\"$val\"" >> "$file.tmp"
  mv "$file.tmp" "$file"
}

# 调飞书 OpenAPI 拿 tenant_access_token, 失败返回空
lark_get_token() {
  local app_id="$1" app_secret="$2"
  curl -sS -X POST 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal' \
    -H 'Content-Type: application/json' \
    -d "{\"app_id\":\"$app_id\",\"app_secret\":\"$app_secret\"}" 2>/dev/null \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tenant_access_token','') if d.get('code')==0 else '')" 2>/dev/null
}

# 反查 open_id, 失败返回空
lark_lookup_openid() {
  local token="$1" email="$2"
  curl -sS -X POST 'https://open.feishu.cn/open-apis/contact/v3/users/batch_get_id?user_id_type=open_id' \
    -H "Authorization: Bearer $token" \
    -H 'Content-Type: application/json' \
    -d "{\"emails\":[\"$email\"]}" 2>/dev/null \
    | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    if d.get('code') != 0:
        sys.exit(0)
    for u in d.get('data', {}).get('user_list', []):
        if u.get('email') == '$email':
            print(u.get('user_id', ''))
            break
except: pass
" 2>/dev/null
}

# 发测试卡片, 返回 (code, msg). code 0 成功; >0 失败
lark_send_test_card() {
  local token="$1" open_id="$2"
  local card='{"schema":"2.0","config":{"wide_screen_mode":true},"header":{"title":{"tag":"plain_text","content":"🧪 tmux-agent 安装测试"},"template":"green"},"body":{"elements":[{"tag":"div","text":{"tag":"lark_md","content":"如果你在飞书私聊看到这条卡片,**Lark channel 配置完成 ✅**"}}]}}'
  local content=$(echo "$card" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")
  local body=$(cat <<EOF
{"receive_id":"$open_id","msg_type":"interactive","content":$content}
EOF
)
  curl -sS -X POST 'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id' \
    -H "Authorization: Bearer $token" \
    -H 'Content-Type: application/json' \
    -d "$body" 2>/dev/null
}

# 把飞书错误码翻成动作建议
lark_explain_error() {
  case "$1" in
    230006) echo "应用没启用机器人能力. 去 open.feishu.cn 应用 → 应用能力 → 添加 Bot, 启用" ;;
    230099) echo "卡片内容格式问题. 检查 server 渲染日志" ;;
    99991663|99991671) echo "app_secret 错误或被重置, 回应用 → 凭证与基础信息 复制最新 secret" ;;
    99991672) echo "权限 scope 不足. 去应用 → 权限管理 申请 im:message + im:message:send_as_bot, 然后版本管理重新发布版本" ;;
    230002) echo "应用未发布. 去应用 → 版本管理 → 创建版本 → 提交自审通过" ;;
    *) echo "未知错误, 看飞书文档: https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/error-codes" ;;
  esac
}

# ─────── Step 3: WeCom channel ───────
step "[3/6] WeCom (企业微信) channel"

WECOM_ENABLED=false
# 先看 .env 里是否已有, 当回显默认值
EXISTING_WECOM_URL=""
if [ -f "$TMUX_ENV" ]; then
  EXISTING_WECOM_URL=$(grep -oP '^WECOM_WEBHOOK_URL="\K[^"]+' "$TMUX_ENV" 2>/dev/null || true)
fi

if [ -n "$EXISTING_WECOM_URL" ]; then
  prompt_msg="启用 WeCom? (已存有 URL, 回车保留) [Y/n] "
else
  prompt_msg="启用 WeCom 企业微信通知? [y/N] "
fi
read -rp "$prompt_msg" ans
[ -z "$ans" ] && [ -n "$EXISTING_WECOM_URL" ] && ans="y"

if [[ "$ans" =~ ^[Yy] ]]; then
  if [ -n "$EXISTING_WECOM_URL" ]; then
    read -rp "  WeCom webhook URL (回车保留现有): " WECOM_URL
    [ -z "$WECOM_URL" ] && WECOM_URL="$EXISTING_WECOM_URL"
  else
    echo "  操作指引: 企业微信 → 任意群 → 群设置 → 添加群机器人 → 自定义机器人 → 复制 webhook URL"
    read -rp "  WeCom webhook URL: " WECOM_URL
  fi

  if [ -z "$WECOM_URL" ]; then
    err "URL 为空, 跳过 WeCom"
  else
    # 立刻测试
    echo "  实发测试消息..."
    test_resp=$(curl -sS -X POST "$WECOM_URL" -H 'Content-Type: application/json' \
      -d '{"msgtype":"markdown","markdown":{"content":"## 🧪 tmux-agent 安装测试\n\nWeCom channel 已接通, 此条由 install 脚本发送"}}' 2>&1)
    if echo "$test_resp" | grep -q '"errcode":0'; then
      ok "WeCom 测试消息已发, 去企微群确认是否收到"
      upsert_env WECOM_WEBHOOK_URL "$WECOM_URL" "$TMUX_ENV"
      WECOM_ENABLED=true
    else
      err "WeCom 测试发送失败: $test_resp"
      hint "URL 可能被吊销, 或网络不通. 跳过 WeCom"
    fi
  fi
else
  ok "跳过 WeCom"
fi

# ─────── Step 4: Lark channel ───────
step "[4/6] Lark (飞书) channel"

LARK_ENABLED=false
LARK_APP_ID=""
LARK_OWNER=""

EXISTING_LARK_APPID=""
EXISTING_LARK_OWNER=""
if [ -f "$TMUX_CFG" ]; then
  EXISTING_LARK_APPID=$(python3 -c "
import yaml
try:
    with open('$TMUX_CFG') as f: c=yaml.safe_load(f) or {}
    print(c.get('notify',{}).get('channels',{}).get('lark',{}).get('app_id','') or '')
except: pass
" 2>/dev/null)
  EXISTING_LARK_OWNER=$(python3 -c "
import yaml
try:
    with open('$TMUX_CFG') as f: c=yaml.safe_load(f) or {}
    print(c.get('notify',{}).get('channels',{}).get('lark',{}).get('owner_open_id','') or '')
except: pass
" 2>/dev/null)
fi

if [ -n "$EXISTING_LARK_APPID" ]; then
  prompt_msg="启用 Lark? (已存有 app_id=$EXISTING_LARK_APPID, 回车保留) [Y/n] "
else
  prompt_msg="启用 Lark 飞书通知? [y/N] "
fi
read -rp "$prompt_msg" ans
[ -z "$ans" ] && [ -n "$EXISTING_LARK_APPID" ] && ans="y"

if [[ "$ans" =~ ^[Yy] ]]; then
  cat <<'EOF'

  操作指引 (首次配置, 已配过可跳过):
    1. 浏览器打开 https://open.feishu.cn → 开发者后台 → 创建企业自建应用
    2. "应用能力" → 启用 "机器人 / Bot" (随便配个 menu 应付)
    3. "事件与回调" → "回调配置" tab → 订阅方式选 "长连接" → 订阅 card.action.trigger → 验证连接
    4. "权限管理" → 申请 im:message, im:message:send_as_bot
    5. "版本管理" → 创建版本 → 提交审核通过
    6. "凭证与基础信息" → 复制 App ID 和 App Secret
  完成后请回到这里继续.
EOF

  # app_id
  if [ -n "$EXISTING_LARK_APPID" ]; then
    read -rp "  Lark App ID (回车保留 $EXISTING_LARK_APPID): " LARK_APP_ID
    [ -z "$LARK_APP_ID" ] && LARK_APP_ID="$EXISTING_LARK_APPID"
  else
    read -rp "  Lark App ID (cli_xxxxxxxx): " LARK_APP_ID
  fi

  # app_secret (read -rsp 静默不回显)
  EXISTING_LARK_SECRET=""
  if [ -f "$TMUX_ENV" ]; then
    EXISTING_LARK_SECRET=$(grep -oP '^LARK_APP_SECRET="\K[^"]+' "$TMUX_ENV" 2>/dev/null || true)
  fi
  if [ -n "$EXISTING_LARK_SECRET" ]; then
    read -rsp "  Lark App Secret (回车保留已存的): " LARK_APP_SECRET; echo
    [ -z "$LARK_APP_SECRET" ] && LARK_APP_SECRET="$EXISTING_LARK_SECRET"
  else
    read -rsp "  Lark App Secret: " LARK_APP_SECRET; echo
  fi

  # 验证 token
  echo "  验证 app_id + app_secret..."
  TOKEN=$(lark_get_token "$LARK_APP_ID" "$LARK_APP_SECRET")
  if [ -z "$TOKEN" ]; then
    err "拿不到 tenant_access_token. app_id 或 app_secret 错"
    hint "回 开发者后台 → 凭证与基础信息 → 复制最新 secret"
    exit 1
  fi
  ok "鉴权成功, 拿到 tenant_access_token"

  # owner_open_id: 提供 email 反查
  if [ -n "$EXISTING_LARK_OWNER" ]; then
    read -rp "  owner_open_id 已存在 $EXISTING_LARK_OWNER. 重新反查? [y/N] " yn
    if [[ "$yn" =~ ^[Yy] ]]; then
      EXISTING_LARK_OWNER=""
    else
      LARK_OWNER="$EXISTING_LARK_OWNER"
    fi
  fi

  if [ -z "$LARK_OWNER" ]; then
    read -rp "  你的企业邮箱 (脚本反查 open_id): " MY_EMAIL
    if [ -z "$MY_EMAIL" ]; then
      err "邮箱必填"
      exit 1
    fi
    echo "  反查 open_id..."
    LARK_OWNER=$(lark_lookup_openid "$TOKEN" "$MY_EMAIL")
    if [ -z "$LARK_OWNER" ]; then
      err "反查 open_id 失败"
      hint "可能 scope 不够 (需要 contact:user.base:readonly 或 contact:user.email:readonly)"
      hint "或者你这邮箱在该 app visibility 范围外"
      hint "可手动获取后填入 config.yaml notify.channels.lark.owner_open_id"
      read -rp "  手动输入 open_id (ou_xxx, 留空放弃): " LARK_OWNER
      [ -z "$LARK_OWNER" ] && exit 1
    fi
    ok "反查 owner_open_id = $LARK_OWNER"
  fi

  # 发测试卡片
  echo "  发测试卡片到飞书私聊..."
  resp=$(lark_send_test_card "$TOKEN" "$LARK_OWNER")
  resp_code=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('code',-1))" 2>/dev/null || echo "-1")
  if [ "$resp_code" = "0" ]; then
    ok "测试卡片已发, 去飞书 1:1 私聊机器人确认收到"
    upsert_env LARK_APP_SECRET "$LARK_APP_SECRET" "$TMUX_ENV"
    LARK_ENABLED=true
  else
    err "发卡失败 (code=$resp_code)"
    hint "$(lark_explain_error "$resp_code")"
    hint "原始响应: $resp"
    exit 1
  fi
else
  ok "跳过 Lark"
fi

chmod 600 "$TMUX_ENV" 2>/dev/null
[ -f "$TMUX_ENV" ] && ok "secrets 已存 $TMUX_ENV (chmod 600)"

# ─────── Step 5: 写 config.yaml ───────
step "[5/6] 写 config.yaml + 注册 hook + 补 systemd EnvironmentFile"

python3 - "$TMUX_CFG" "$WECOM_ENABLED" "$LARK_ENABLED" "${LARK_APP_ID:-}" "${LARK_OWNER:-}" <<'PY'
import sys, os, yaml
cfg_path, wecom_en, lark_en, lark_app, lark_owner = sys.argv[1:6]
cfg = {}
if os.path.exists(cfg_path):
  with open(cfg_path) as f: cfg = yaml.safe_load(f) or {}
notify = cfg.setdefault("notify", {})
ch = notify.setdefault("channels", {})
ch.setdefault("wecom", {})["enabled"] = (wecom_en == "true")
ch["wecom"].setdefault("webhook_url_env", "WECOM_WEBHOOK_URL")
lark = ch.setdefault("lark", {})
lark["enabled"] = (lark_en == "true")
lark.setdefault("app_secret_env", "LARK_APP_SECRET")
lark.setdefault("send_target", "user")
if lark_app:   lark["app_id"] = lark_app
if lark_owner: lark["owner_open_id"] = lark_owner
os.makedirs(os.path.dirname(cfg_path), exist_ok=True)
with open(cfg_path, "w") as f: yaml.safe_dump(cfg, f, sort_keys=False, allow_unicode=True)
print(f"  ✓ config: {cfg_path}")
PY

[ ! -f "$SETTINGS" ] && echo '{}' > "$SETTINGS"
TMP="$(mktemp)"
jq --arg cmd "bash $HOOK_SH" '
  .hooks //= {} |
  .hooks.Stop //= [] |
  .hooks.PermissionRequest //= [] |
  (.hooks.Stop, .hooks.PermissionRequest) |= (
    map(.hooks |= map(select(.command | test("notify_wechat.sh") | not)))
    | map(select(.hooks | length > 0))
  ) |
  (if (.hooks.Stop | map(select(.hooks[]?.command == $cmd)) | length) == 0
   then .hooks.Stop += [{"matcher":"", "hooks":[{"type":"command","command":$cmd}]}]
   else . end) |
  (if (.hooks.PermissionRequest | map(select(.hooks[]?.command == $cmd)) | length) == 0
   then .hooks.PermissionRequest += [{"matcher":".*", "hooks":[{"type":"command","command":$cmd}]}]
   else . end)
' "$SETTINGS" > "$TMP" && mv "$TMP" "$SETTINGS"
ok "Claude hook 注册到 $SETTINGS"

if [ -f "$UNIT" ] && ! grep -q "^EnvironmentFile=-\?%h/.config/tmux-agent/\.env" "$UNIT"; then
  sed -i '/^\[Service\]/a EnvironmentFile=-%h/.config/tmux-agent/.env' "$UNIT"
  systemctl --user daemon-reload
  ok "已给 systemd unit 加 EnvironmentFile"
elif [ -f "$UNIT" ]; then
  ok "systemd unit EnvironmentFile 已存在, 跳过"
else
  warn "systemd unit 不在 ($UNIT). 如果你用其他方式跑 tmux-agent, 自己保证 .env 被加载"
fi

# ─────── Step 6: 重启 + 验证 service ───────
step "[6/6] 重启 service + 检查"
if systemctl --user list-unit-files | grep -q '^tmux-agent.service'; then
  systemctl --user restart tmux-agent
  sleep 3
  if systemctl --user is-active --quiet tmux-agent; then
    ok "service active"
    if [ "$LARK_ENABLED" = "true" ]; then
      if journalctl --user -u tmux-agent --since "10 sec ago" --no-pager 2>/dev/null | grep -q 'ws client ready'; then
        ok "Lark WS 长连已建立"
      else
        warn "未在 log 找到 'ws client ready', 可能 SDK 还在重连"
        hint "看: journalctl --user -u tmux-agent -f"
      fi
    fi
  else
    err "service 启动失败"
    hint "看: journalctl --user -u tmux-agent -n 30 --no-pager"
    exit 1
  fi
else
  warn "tmux-agent.service 未安装, 跳过重启. 装一下: ./scripts/install-systemd.sh"
fi

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 安装完成! 当前配置:"
echo "   WeCom (企业微信): $( [ "$WECOM_ENABLED" = true ] && echo 启用 || echo 关闭 )"
echo "   Lark  (飞书):     $( [ "$LARK_ENABLED"  = true ] && echo 启用 || echo 关闭 )"
echo
echo "下一步: 触发任意 Claude Code Stop / PermissionRequest 验证收消息."
echo "看 server log: journalctl --user -u tmux-agent -f"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
