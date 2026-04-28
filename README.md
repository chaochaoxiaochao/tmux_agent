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

## Claude Code Hook 集成（让 wall 闪烁）

Claude Code 弹"等输入"或"任务完成"时，让对应 wall tile 黄/蓝闪烁。原理：Claude Code 的 `Notification` / `Stop` hook 调用 tmux-agent 的 `POST /api/notify` 接口，告诉它哪个 tmux pane 该被关注。进入 attached view 自动清。

### 1. 在 Claude Code 注册 hook

`~/.claude/settings.json`：

```json
{
  "hooks": {
    "Notification": [
      { "matcher": "", "hooks": [
        { "type": "command", "command": "bash ~/.claude/hooks/tmux_agent_notify.sh" }
      ]}
    ],
    "Stop": [
      { "matcher": "", "hooks": [
        { "type": "command", "command": "bash ~/.claude/hooks/tmux_agent_notify.sh" }
      ]}
    ]
  }
}
```

### 2. Hook 脚本

`~/.claude/hooks/tmux_agent_notify.sh`：

```bash
#!/bin/bash
TMUX_AGENT_URL="${TMUX_AGENT_URL:-http://127.0.0.1:7681}"
json_input=$(cat)

hook_event_name=$(echo "$json_input" | jq -r '.hook_event_name')
notification_type=$(echo "$json_input" | jq -r '.notification_type // ""')

# Claude Code 用户没回应时会发 notification_type=idle_prompt 的 Notification
# (message="Claude is waiting for your input")。这不是真的"该回了"，
# 是定时催促，吞掉。真正的等输入（permission 请求）没有这个字段。
if [ "$hook_event_name" = "Notification" ] && [ "$notification_type" = "idle_prompt" ]; then
  exit 0
fi

# 把当前 tmux pane 翻译成 session/window，调 tmux-agent。
[ -z "$TMUX_PANE" ] && exit 0
target=$(tmux display-message -p -t "$TMUX_PANE" '#{session_name},#{window_id}' 2>/dev/null)
[ -z "$target" ] && exit 0
s="${target%%,*}"; w="${target##*,}"

if [ "$hook_event_name" = "Stop" ]; then
  kind="done"             # 任务完成 → 蓝色脉动
else
  kind="input-needed"     # 等输入 → 黄色脉动
fi

curl -sX POST "$TMUX_AGENT_URL/api/notify" \
  -H 'content-type: application/json' \
  -d "{\"session\":\"$s\",\"windowId\":\"$w\",\"kind\":\"$kind\"}" \
  >/dev/null 2>&1 &
```

`chmod +x` 一下。tmux-agent 服务必须在跑（`127.0.0.1:7681`）。

### 3. 调试

如果 wall 没闪烁：

- 确认 Claude Code 跑在 tmux 里：`echo $TMUX_PANE` 非空
- 看 hook 实际收到的 JSON：在脚本顶部加 `cat >> /tmp/claude-hook.log` 看 Claude 发了什么
- 检查 tmux-agent 收到了：`curl http://127.0.0.1:7681/api/sessions` 应该 200

## systemd 一键启动

```bash
./scripts/install-systemd.sh
systemctl --user status tmux-agent
journalctl --user -u tmux-agent -f
```

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
