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
