# tmux-agent 通知配置指南

tmux-agent 在 Claude Code 触发 `Stop` / `PermissionRequest` / `Notification` 事件时，向你配置的 channel 推送通知。当前支持 **企业微信** 和 **飞书** 两种 channel，可独立启用 / 关闭，也可同时开。

## 整体链路

```
Claude Code (在 tmux pane 内跑)
  └─ ~/.claude/hooks/notify.sh        ← Claude Code 触发的 hook 脚本
       │ POST localhost:7681/api/notify
       ▼
tmux-agent server
  ├─ WecomChannel → 推企业微信 markdown 到 webhook
  └─ LarkChannel  → 飞书 SDK 长连接, 发 interactive card
```

**重要**：
- secret（webhook URL / app_secret）只存在 `~/.config/tmux-agent/.env`（chmod 600），不入 yaml 不入 repo。
- 配置文件 `~/.config/tmux-agent/config.yaml` 的 `notify.channels.{wecom,lark}.enabled` 各自独立开关。
- 不想用通知，把 `enabled: false` 即可，server 启动不会因为某个 channel 没配而失败。

---

## 一键安装

99% 的场景跑这一条就够，**交互式询问每个 channel 配置**：

```bash
cd /path/to/tmux_agent
./scripts/install-notify-hook.sh
```

脚本会：
1. 检查依赖 (`jq` / `curl` / `tmux`)
2. 备份老 hook (`notify_wechat.sh` → `.bak`)
3. 复制 `docs/notify.sh` 到 `~/.claude/hooks/notify.sh`
4. 交互式问 WeCom 是否启用 + URL
5. 交互式问 Lark 是否启用 + app_id / app_secret / owner_open_id
6. 写 secret 到 `~/.config/tmux-agent/.env`（chmod 600）
7. 写 config.yaml 的 `notify.channels` 段
8. 给 systemd unit 加 `EnvironmentFile=` 让 service 进程能读到 secret
9. 在 `~/.claude/settings.json` 注册新 hook（清掉老 wecom hook entry）

完成后：

```bash
systemctl --user restart tmux-agent
journalctl --user -u tmux-agent -f       # 看 server 日志
```

如果你**先只配企业微信，过段时间再加飞书**，再跑一次 `install-notify-hook.sh` 即可——脚本幂等。

---

## 企业微信配置

最简单的 channel——只需要一个 webhook URL。

### 1. 拿企业微信群机器人 webhook URL

在企业微信 PC 客户端打开**任意群** → 群设置 → 添加群机器人 → 自定义机器人 → 复制 URL（形如 `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx`）。

### 2. 配进 tmux-agent

跑 `./scripts/install-notify-hook.sh`，第一个交互问题选 `y`，贴 URL 进去。

或者手动：
```bash
# ~/.config/tmux-agent/.env (chmod 600)
WECOM_WEBHOOK_URL="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"
```

```yaml
# ~/.config/tmux-agent/config.yaml
notify:
  channels:
    wecom:
      enabled: true
      webhook_url_env: WECOM_WEBHOOK_URL
```

### 3. 重启 + 验证

```bash
systemctl --user restart tmux-agent
```

随便触发一次 Claude Code 的 Stop / PermissionRequest，企业微信群应该收到 markdown 通知（标题 / Session / Cwd / Time / Web 链接 / agents 列表）。

### 故障排查

| 症状 | 排查 |
|---|---|
| 服务启不来，log 报 `WECOM_WEBHOOK_URL is empty` | 检查 systemd unit 是否有 `EnvironmentFile=-%h/.config/tmux-agent/.env`，重跑 install 脚本会补 |
| 服务正常但企微不收 | log 看是否有 `[wecom] send failed:`；检查 webhook URL 是否还有效（被群管理员吊销了？） |

---

## 飞书配置

飞书比企业微信多 4 步，因为飞书需要**创建一个企业自建应用（智能体）+ 启用机器人能力 + 长连接订阅**。一次性配，之后就能用。

### 1. 创建飞书自建应用 / 智能体

**入口**：[https://open.feishu.cn](https://open.feishu.cn) → "开发者后台" → "创建企业自建应用"

填写：
- **应用名称**：随意（如 `tmux-agent-bot` / `个人 Agent 助手`）
- **应用描述**：随意（如 "tmux-agent 通知机器人"）
- **应用图标**：上传一个图标（必填，不上传无法发布）

点"创建"。

### 2. 启用机器人能力

进入新建的应用 → 左侧"应用能力" / "添加应用能力" → 找到 **"机器人 / Bot"** → 点 **启用**。

**只启用机器人这一项**，不要加其它（邮箱、文档、网页应用、小程序都不需要）。

启用时可能会让你：
- 填机器人名字、头像、简介（随意）
- 配 **Custom Bot Menu** —— 飞书强制至少配一项，**应付一下即可**：选 "Send a message" 类型，name 填 `Help`，message 填任意一句话（如 `tmux-agent 通知机器人`）。这个菜单实际不被 tmux-agent 用。
- 配 webhook URL / 卡片回调地址等 —— **全部留空**，我们走长连接，不需要公网 URL。

### 3. 配置事件与回调（长连接模式）

进入应用 → 左侧 **"事件与回调"** → 顶部 **"回调配置"** tab。

注意：「事件配置」和「回调配置」是两个独立 tab：
- 「事件配置」管 `im.message.receive_v1` 这类消息事件（我们暂时不用）
- 「回调配置」管 `card.action.trigger` 这类卡片按钮回调（**我们用这个**）

在 「回调配置」 里：
1. **订阅方式**：选 **"Receive callbacks through persistent connection / 使用长连接接收回调"**
2. **回调订阅列表**：添加 **`card.action.trigger`**
3. 保存后，**点页面下方 "Verify connection" / "验证连接"** 按钮，应该提示 "verification successful"

### 4. 权限管理

左侧 **"权限管理"** → 申请以下 scope：
- `im:message:send_as_bot` —— 必需（让机器人发消息）
- `im:message` —— 必需（基础消息能力）

申请完，**必须发布版本审核通过才生效**。

### 5. 创建版本 + 发布

左侧 **"版本管理"** → "创建版本" → 填版本号（如 `1.0.0`） → 提交。如果你是租户管理员可以自审通过；否则联系管理员审批。

**没发布的事件订阅不下发** —— 跳过这步会出现"server WS 接通了但点按钮没反应"的怪事。

### 6. 拿到自己的 open_id

owner_open_id 是 tmux-agent 决定"把卡片发给谁"的依据。最简单的方法是用 app_id/secret 调一次 API 反查：

```bash
APP_ID=cli_xxxxxxxx        # 你应用的 App ID
APP_SECRET=xxxxxxxx         # 你应用的 App Secret
MY_EMAIL=you@yourcompany.com  # 你的飞书企业邮箱

TOKEN=$(curl -s -X POST 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal' \
  -H 'Content-Type: application/json' \
  -d "{\"app_id\":\"$APP_ID\",\"app_secret\":\"$APP_SECRET\"}" | jq -r .tenant_access_token)

curl -s -X POST 'https://open.feishu.cn/open-apis/contact/v3/users/batch_get_id?user_id_type=open_id' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"emails\":[\"$MY_EMAIL\"]}" | jq
```

返回类似：
```json
{"code":0,"data":{"user_list":[{"email":"you@yourcompany.com","user_id":"ou_xxxxxxxx..."}]}}
```

那个 `user_id` 字段（虽然字段叫 user_id，但因为 `user_id_type=open_id`，实际就是 open_id）就是你的 `owner_open_id`。

### 7. 加机器人为好友

在飞书 app → 通讯录 → 搜你机器人的名字 → 加好友。卡片会发到这个 1:1 私聊会话里。

### 8. 配进 tmux-agent

跑 `./scripts/install-notify-hook.sh`，到 Lark 那个交互问题选 `y`，依次填 `app_id` / `app_secret` / `owner_open_id`。

或者手动：
```bash
# ~/.config/tmux-agent/.env (chmod 600)
LARK_APP_SECRET="xxxxxxxx..."
```

```yaml
# ~/.config/tmux-agent/config.yaml
notify:
  channels:
    lark:
      enabled: true
      app_id: cli_xxxxxxxx
      app_secret_env: LARK_APP_SECRET
      owner_open_id: ou_xxxxxxxx...
      send_target: user
```

### 9. 重启 + 验证

```bash
systemctl --user restart tmux-agent
journalctl --user -u tmux-agent -n 20 --no-pager
```

应该看到：
```
[info]: [ 'client ready' ]
[info]: [ '[ws]', 'ws client ready' ]
```

触发一次 Claude Code 事件，飞书 1:1 私聊应该收到 interactive card。

### 故障排查

| 症状 | 排查 |
|---|---|
| `Bot ability is not activated` (code 230006) | 应用没启用机器人能力，回 step 2 |
| 卡片发出但飞书显示"请升级至最新版本客户端" | 你的飞书 client 版本太老，渲染不了 schema 2.0。升级飞书 app |
| 卡片正常但点按钮无反应 | 检查"回调配置" tab 的订阅方式选了长连接 + `card.action.trigger` 已订阅 + 版本审核通过 |
| `[lark] send failed:` log | 看具体 error code。常见：app_id/secret 错；scope 没申请；version 没发布 |
| WS 一直重连 | 看 SDK debug log。可能 app_secret 错；或者飞书租户没开启机器人功能 |

---

## 关闭 channel

把对应 `enabled: false` 即可，**不需要删 secret 或拔 app 配置**：

```yaml
notify:
  channels:
    wecom:
      enabled: false
    lark:
      enabled: false
```

`systemctl --user restart tmux-agent` 生效。

如果两个都关，server 启动正常，hook 触发只会有 wall flash（web 端 tile 闪烁），没有 IM 推送。

---

## 维护

### 改 hook 脚本逻辑

改 **`docs/notify.sh`**（repo 内的源），然后重跑 `./scripts/install-notify-hook.sh` 让它覆盖 `~/.claude/hooks/notify.sh`。

⚠️ **不要**直接改 `~/.claude/hooks/notify.sh` —— install 脚本会覆盖。改 `docs/` 才是源。

### 改 webhook URL

```bash
# 编辑 ~/.config/tmux-agent/.env, 改 URL 那一行
systemctl --user restart tmux-agent
```

或者重跑 `install-notify-hook.sh`，第二次跑会用 `upsert_env` 替换（不堆重复行）。

### 想看飞书机器人发了什么 / 收到什么

```bash
journalctl --user -u tmux-agent -f | grep -E 'lark|wecom|api.notify'
```

### 添加更多 channel

server 的 `Channel` interface 是 plugin 形态。看 `server/src/notify/channel-wecom.ts` / `channel-lark.ts` 是怎么实现的，仿一个 `channel-<your-im>.ts` 就行。
