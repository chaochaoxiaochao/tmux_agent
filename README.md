# tmux-agent

浏览器里使用 tmux：户外用手机/笔记本通过 VPN 访问家里主机的 tmux session。每个 tile 是一个 tmux window，点开就是一个全屏 xterm，配套固定按钮 / 文本输入 / 语音 / `@/` 补全。

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

statusRules:
  - match: "\\[y/N\\]"
    status: warn
```

按钮 `payload` 转义：`\n` → Enter，`\t` → Tab，`` → ESC。

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
