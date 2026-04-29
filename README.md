# tmux-agent

浏览器里使用 tmux：户外用手机/笔记本通过 VPN 访问家里主机的 tmux session。每个 tile 是一个 tmux window，点开就是一个全屏 xterm，配套固定按钮 / 文本输入。

**Wall 视图**列出所有 tmux session（每个 session 一组 tile），tile 颜色：

- 🟢 **绿** — 该 pane 最近 5 秒有输出
- ⚪ **灰** — 静止
- 🟡 **黄脉动 + INPUT badge** — 外部 hook 触发的"等输入"提醒（见下文 Claude Code 集成）
- 🔵 **蓝脉动 + DONE badge** — 外部 hook 触发的"任务完成"提醒

进入对应 attached view 自动清掉脉动状态。

## 前置

- Node.js ≥ 18
- tmux（`apt install tmux` / `brew install tmux`）
- 一台 VPN 网关或 Tailscale，让户外设备能访问到本机（应用层不做认证）

## 首次启动

```bash
git clone <repo> tmux-agent
cd tmux-agent
npm install
npm run build
tmux new -d -s claude    # 你的目标 session
npm start
# → 监听 0.0.0.0:7681；本机访问 http://127.0.0.1:7681；同网段/VPN 设备改用主机 IP
```

## 配置文件

`~/.config/tmux-agent/config.yaml`，第一次启动自动写默认。

```yaml
server:
  host: 0.0.0.0     # 默认监听全部网卡；想锁本机改 127.0.0.1
  port: 7681

tmux:
  session: claude

buttons:
  - id: btn-yes
    label: "Yes"
    payload: "y\n"
  - id: btn-esc
    label: "Esc"
    payload: ""

# Optional. Regex match on capture-pane output to color tiles.
# Default empty - wall only uses activity (5s-running/idle) and hook attention.
# Watch out: persistent UI strings like Claude Code's "ENTER N." menu will
# match constantly and stick the tile in warn forever.
statusRules: []
```

按钮 `payload` 转义：`\n` → Enter，`\t` → Tab，`` → ESC。

## Claude Code Hook 集成（让 wall 闪烁 + 企微推送 + deep link）

Claude Code 弹"等输入"或"任务完成"时：
1. tmux-agent 的对应 wall tile 黄/蓝闪烁（进 attached view 自动清）
2. 推一条企微消息，带「打开 Web 终端」可点链接，跳转到对应 attached view

原理：Claude Code 的 `Notification` / `Stop` hook 调用一个 bash 脚本，脚本同时干两件事——POST `/api/notify` 给 tmux-agent，POST 企微 webhook。

### 1. config.yaml 加 publicUrl

`~/.config/tmux-agent/config.yaml` 顶部加一行：

```yaml
server:
  host: 0.0.0.0
  port: 7681
  publicUrl: http://<your-host-ip>:7681   # 外部可访问的链接（hook 拼进通知消息让点击跳转）
```

替换 `<your-host-ip>` 为：
- 走 VPN 的话 → VPN 网卡 IP（`ip -4 addr` 查）
- 内网 → 内网 IP
- 不配置就回退到 `127.0.0.1`，企微链接会点不开

改完 `systemctl --user restart tmux-agent`。

### 2. 注册 hook

`~/.claude/settings.json`：

```json
{
  "hooks": {
    "Notification": [
      { "matcher": "", "hooks": [
        { "type": "command", "command": "bash ~/.claude/hooks/notify.sh" }
      ]}
    ],
    "Stop": [
      { "matcher": "", "hooks": [
        { "type": "command", "command": "bash ~/.claude/hooks/notify.sh" }
      ]}
    ]
  }
}
```

### 3. Hook 脚本

`~/.claude/hooks/notify.sh`（`chmod +x`）：

```bash
#!/bin/bash
# 通知脚本：tmux-agent wall 闪烁 + 企微 markdown 消息（带 deep link）

# !!! 改成你自己的企微机器人 webhook URL !!!
# 群机器人 → 添加 → 选择「群机器人」→ 复制 webhook URL
# 留空字符串则跳过企微推送，只闪烁 wall tile。
WECOM_WEBHOOK=""

TMUX_AGENT_URL="${TMUX_AGENT_URL:-http://127.0.0.1:7681}"

json_input=$(cat)
hook_event_name=$(echo "$json_input" | jq -r '.hook_event_name')
notification_type=$(echo "$json_input" | jq -r '.notification_type // ""')
message=$(echo "$json_input" | jq -r '.message')
session_id=$(echo "$json_input" | jq -r '.session_id')
cwd=$(echo "$json_input" | jq -r '.cwd')

# Claude Code 用户没回应时会发 notification_type=idle_prompt 的 Notification
# (message="Claude is waiting for your input")。这不是真的等输入（permission
# 请求那种没有这个字段），是定时催促，吞掉避免误报。
if [ "$hook_event_name" = "Notification" ] && [ "$notification_type" = "idle_prompt" ]; then
  exit 0
fi

# 解析当前 tmux pane → session/window-id（戳 tmux-agent + 拼 deep link）
TMUX_S=""; TMUX_W=""
if [ -n "$TMUX_PANE" ]; then
  target=$(tmux display-message -p -t "$TMUX_PANE" '#{session_name},#{window_id}' 2>/dev/null)
  if [ -n "$target" ]; then
    TMUX_S="${target%%,*}"
    TMUX_W="${target##*,}"
  fi
fi

# 戳 tmux-agent 让对应 window tile 闪烁
if [ -n "$TMUX_S" ] && [ -n "$TMUX_W" ]; then
  kind="input-needed"
  [ "$hook_event_name" = "Stop" ] && kind="done"
  curl -sX POST "$TMUX_AGENT_URL/api/notify" \
    -H 'content-type: application/json' \
    -d "{\"session\":\"$TMUX_S\",\"windowId\":\"$TMUX_W\",\"kind\":\"$kind\"}" \
    > /dev/null 2>&1 &
fi

# 推企微（webhook 没配就跳过）
[ -z "$WECOM_WEBHOOK" ] && exit 0

# 拼 deep link
PUBLIC_URL=$(curl -s "$TMUX_AGENT_URL/api/config" 2>/dev/null | jq -r '.publicUrl // empty')
[ -z "$PUBLIC_URL" ] && PUBLIC_URL="$TMUX_AGENT_URL"
url_encode() { jq -rRn --arg s "$1" '$s|@uri'; }
DEEP_LINK=""
if [ -n "$TMUX_S" ] && [ -n "$TMUX_W" ]; then
  DEEP_LINK="$PUBLIC_URL/#/w/$(url_encode "$TMUX_S")/$(url_encode "$TMUX_W")"
fi

if [ "$hook_event_name" = "Stop" ]; then
  HEAD="✅ Claude Code 任务完成"
  BODY="主人我完成任务了\n>Cwd: \`$cwd\`\n>Session: \`$session_id\`"
else
  HEAD="🔔 Claude Code 等输入"
  BODY="$message\n>Cwd: \`$cwd\`"
fi
LINK_LINE=""
[ -n "$DEEP_LINK" ] && LINK_LINE="\n>[👉 打开 Web 终端]($DEEP_LINK)"

CONTENT="## $HEAD\n${BODY}${LINK_LINE}"
curl -s -X POST "$WECOM_WEBHOOK" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg c "$(printf '%b' "$CONTENT")" '{msgtype:"markdown", markdown:{content:$c}}')" \
  > /dev/null 2>&1
```

### 4. 调试

- 确认 Claude Code 跑在 tmux 里：`echo $TMUX_PANE` 非空
- 看 hook 实际收到的 JSON：在脚本顶部加 `{ date; cat; echo; } >> /tmp/claude-hook.log` 复现一次后看 log
- 检查 tmux-agent 在跑：`curl http://127.0.0.1:7681/api/sessions` 应该 200
- 检查 publicUrl 配对：`curl http://127.0.0.1:7681/api/config | jq .publicUrl`

## systemd 一键启动

脚本装的是 **user-level systemd unit**（跑在你账号下，不需要 sudo）。原因：tmux-agent 必须以你的身份跑才能访问你的 tmux server（socket 在 `/tmp/tmux-<uid>/`）、读 `~/.config/tmux-agent/config.yaml`、用你的 shell 生成 PTY。

### 安装

```bash
./scripts/install-systemd.sh
```

脚本会：
1. 检查 `tmux` 和 `node` 在 PATH
2. 写 `~/.config/systemd/user/tmux-agent.service`
3. `npm install && npm run build`
4. `systemctl --user daemon-reload && enable --now tmux-agent`

装完即在跑。装之前如果手动起过 `node server/dist/main.js`，先 `pkill` 掉避免端口冲突。

### 常用命令

```bash
systemctl --user status tmux-agent       # 看状态（active/failed）
systemctl --user restart tmux-agent      # 改了代码 npm run build 后重启
systemctl --user stop tmux-agent         # 停
systemctl --user start tmux-agent        # 起
systemctl --user disable tmux-agent      # 取消开机自启（不卸载文件）
systemctl --user disable --now tmux-agent  # 同时停掉
journalctl --user -u tmux-agent -f       # 实时跟日志
journalctl --user -u tmux-agent -n 200   # 看最近 200 行
journalctl --user -u tmux-agent --since '10 min ago'
```

### 让服务在你登出后也活着（lingering）

`--user` 实例默认**登出即停**。要"机器开着就一直跑"（夜里手机随时连）：

```bash
loginctl enable-linger $USER             # 一次性，永久生效
loginctl show-user $USER | grep Linger   # 验证：Linger=yes
```

关掉：`loginctl disable-linger $USER`。

### 卸载

```bash
systemctl --user disable --now tmux-agent
rm ~/.config/systemd/user/tmux-agent.service
systemctl --user daemon-reload
```

### Troubleshooting

- **`Failed to connect to user scope bus via local transport`** —— 你不是通过 ssh 直接登录而是用 sudo 切过来的。`sudo` 的 user systemd 没启。先 `loginctl enable-linger $USER` + 直接登录该用户。
- **`active (running)` 但 wall 全空** —— 服务起来了但没 tmux session。`tmux ls` 看一眼，新建一个：`tmux new -d -s claude`。
- **改了代码但没生效** —— 别忘 `npm run build`，再 `systemctl --user restart tmux-agent`。frontend 改了不重启服务也行（fastify-static 直接读 `web/dist/` 文件），但浏览器要强刷。

## 安全警告

应用层**没有认证**。默认监听 `0.0.0.0` 意味着同网段/VPN 上的任何设备都能访问。要保证安全，**访问链路必须由 VPN 或防火墙兜底**：

- 推荐：跑在 VPN（Tailscale / WireGuard / 公司 VPN）网络下，户外设备通过 VPN 访问主机 IP
- 不要把这个端口直接转发到公网（NAT/端口映射）—— 任何能连到的人都能完整操作你的 tmux
- 想严格点：把 `server.host` 改成 `127.0.0.1`（仅本机），或改成具体的 VPN 网卡 IP（仅 VPN 内）

## 测试

```bash
npm test                 # 单元测试
npm run test:integration # 真 tmux 集成测试（需要 tmux 在 PATH）
```
