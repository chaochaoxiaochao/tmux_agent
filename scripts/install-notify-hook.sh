#!/bin/bash
# 一键安装 tmux-agent 的通知 hook (wecom + lark 双通道).
# Usage:
#   ./scripts/install-notify-hook.sh

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE="$REPO_ROOT/docs/notify.sh"
HOOK_DIR="$HOME/.claude/hooks"
HOOK_SH="$HOOK_DIR/notify.sh"
HOOK_ENV="$HOOK_DIR/notify.env"
SETTINGS="$HOME/.claude/settings.json"
TMUX_CFG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/tmux-agent"
TMUX_CFG="$TMUX_CFG_DIR/config.yaml"
TMUX_ENV="$TMUX_CFG_DIR/.env"

mkdir -p "$HOOK_DIR" "$TMUX_CFG_DIR"

# --- 1. 检查依赖 ---
for bin in jq curl tmux; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "ERR: $bin not found, please install it first." >&2; exit 1
  fi
done

# --- 2. 老脚本迁移检测 ---
OLD_HOOK="$HOOK_DIR/notify_wechat.sh"
if [ -f "$OLD_HOOK" ]; then
  echo "[migrate] backing up old notify_wechat.sh → notify_wechat.sh.bak"
  mv "$OLD_HOOK" "${OLD_HOOK}.bak"
fi

# --- 3. cp 脚本 ---
cp "$TEMPLATE" "$HOOK_SH"
chmod +x "$HOOK_SH"
echo "[ok] hook: $HOOK_SH"

# --- 4. 配置 wecom (可选) ---
echo
read -rp "Enable WeCom (企业微信) channel? [y/N] " ans
if [[ "$ans" =~ ^[Yy] ]]; then
  read -rp "  WeCom webhook URL: " WECOM_URL
  echo "WECOM_WEBHOOK_URL=\"$WECOM_URL\"" >> "$TMUX_ENV"
  WECOM_ENABLED=true
else
  WECOM_ENABLED=false
fi

# --- 5. 配置 lark (可选) ---
read -rp "Enable Lark (飞书) channel? [y/N] " ans
if [[ "$ans" =~ ^[Yy] ]]; then
  echo
  echo "  你需要先去 open.feishu.cn 建一个企业自建应用 → 启用机器人能力。"
  echo "  事件与回调要选 '使用长连接接收事件',然后订阅 im.message.receive_v1 + card.action.trigger。"
  read -rp "  Lark app_id (cli_xxxx): " LARK_APP_ID
  read -rsp "  Lark app_secret: " LARK_APP_SECRET; echo
  read -rp "  Owner open_id (ou_xxxx, 谁收消息): " LARK_OWNER
  echo "LARK_APP_SECRET=\"$LARK_APP_SECRET\"" >> "$TMUX_ENV"
  LARK_ENABLED=true
else
  LARK_ENABLED=false
fi

chmod 600 "$TMUX_ENV"
echo "[ok] secrets: $TMUX_ENV"

# --- 6. 写 config.yaml notify 段 (幂等) ---
python3 - "$TMUX_CFG" "$WECOM_ENABLED" "$LARK_ENABLED" "${LARK_APP_ID:-}" "${LARK_OWNER:-}" <<'PY'
import sys, os
try: import yaml
except ImportError:
  print("ERR: python3-yaml required (pip install pyyaml)", file=sys.stderr); sys.exit(1)
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
if lark_app: lark["app_id"] = lark_app
if lark_owner: lark["owner_open_id"] = lark_owner
os.makedirs(os.path.dirname(cfg_path), exist_ok=True)
with open(cfg_path, "w") as f: yaml.safe_dump(cfg, f, sort_keys=False, allow_unicode=True)
print(f"[ok] config: {cfg_path}")
PY

# --- 7. 注册到 ~/.claude/settings.json (jq 幂等) ---
[ ! -f "$SETTINGS" ] && echo '{}' > "$SETTINGS"
TMP="$(mktemp)"
jq --arg cmd "bash $HOOK_SH" '
  .hooks //= {} |
  .hooks.Stop //= [] |
  .hooks.PermissionRequest //= [] |
  # 先清掉老 notify_wechat.sh entry
  .hooks.Stop |= map(select(.hooks[]?.command | test("notify_wechat.sh") | not)) |
  .hooks.PermissionRequest |= map(select(.hooks[]?.command | test("notify_wechat.sh") | not)) |
  # 注册新 entry (幂等)
  (if (.hooks.Stop | map(select(.hooks[]?.command == $cmd)) | length) == 0
   then .hooks.Stop += [{"matcher":"", "hooks":[{"type":"command","command":$cmd}]}]
   else . end) |
  (if (.hooks.PermissionRequest | map(select(.hooks[]?.command == $cmd)) | length) == 0
   then .hooks.PermissionRequest += [{"matcher":".*", "hooks":[{"type":"command","command":$cmd}]}]
   else . end)
' "$SETTINGS" > "$TMP" && mv "$TMP" "$SETTINGS"
echo "[ok] settings: $SETTINGS"

# --- 8. 提示 restart ---
echo
echo "Done. Restart tmux-agent for config changes:"
echo "  systemctl --user restart tmux-agent"
