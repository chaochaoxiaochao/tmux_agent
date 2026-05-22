# tmux-agent

浏览器里使用 tmux 的轻量 web 化客户端 (Vue 3 + TS 前端 + Fastify Node 后端 monorepo)。每个 tile = 一个 tmux window, 点开是全屏 xterm + AttachedComposer (输入条) + ScrollControls (功能键)。

## Commands

| Command | Description |
|---------|-------------|
| `npm run build` | 全量构建 web + server (顶层 workspace 命令) |
| `cd web && npm run build` | 只构建前端 (改 .vue / 前端 .ts 后必跑, 浏览器还要强刷) |
| `npm test` | 跑 server unit 测试 (vitest, web 无测试) |
| `systemctl --user restart tmux-agent` | 重启服务 (改完代码 + build 后跑这条生效) |
| `systemctl --user status tmux-agent` | 看服务状态 |
| `journalctl --user -u tmux-agent -f` | 实时日志 |

## Architecture

```
tmux_agent/
  server/src/           # Fastify 后端 (TS)
    main.ts             # 真入口 (systemd ExecStart 指向编译产物 dist/main.js)
    server.ts           # buildServer() factory, 不含 listen
    routes/             # REST + WS endpoints (api.windows / api.upload / api.completion / api.notify / api.debug / api.slash)
    tmux-control.ts     # 通过 tmux 命令行 + pipe-pane 跟 tmux 交互 (PaneMeta 含 cwd / cmd / size / active / inMode)
    pty-bridge.ts       # node-pty + WS 桥, 把 tmux pane 字节流推给浏览器 + ws-open 时调 getSlashList 预热 slash list + 绑定 PaneMetaPusher
    pane-meta-{pusher,registry}.ts  # 每 WS 连接 1 个 PaneMetaPusher (2s 嗅探 + diff push, pushing 互斥锁); 检测 active pane cmd 非claude→claude 边沿触发 onClaudeAppeared 回调 (slash list 重拉); REST handler 通过 pane-meta-registry.pushNow(session,windowId) 触发立即推; 注册表按 (session,windowId) → Set<pusher> 广播到所有连同一 window 的 WS
    upload-gc.ts        # 后台 GC, 删 ~/.local/share/tmux-agent/uploads/ 下 7 天未访问文件
    slash-{types,builtin,sdk,cache}.ts  # composer / 补全 = Claude Agent SDK init message 拿 list + cwd-keyed cache + 8 内置写死合并
  web/src/
    views/
      WindowWall.vue    # 总览页 (tile 网格 + 状态/通知)
      AttachedView.vue  # 单 window 全屏页, 含 XtermPane + ScrollControls + AttachedComposer
    components/
      XtermPane.vue     # xterm.js 包装, 只读显示终端 (手机端禁掉 helper textarea focus)
      AttachedComposer.vue  # 底部输入条: 文本 + /@ 补全 + 附件 chip + send/📎
      ScrollControls.vue    # PgUp/PgDn/Yes/No/Esc/^C/⏎/d-pad 一排功能键 (手机用)
      MentionPicker.vue     # /@ 补全候选浮层
      PaneStrip.vue         # 多 pane 切换条
  ~/.config/tmux-agent/config.yaml   # 运行时配置 (用户机器本地, 不在 repo)
  ~/.local/share/tmux-agent/uploads/ # 附件上传根 (按 session/window 分目录)
```

## Gotchas

- **真入口是 `server/dist/main.js`** —— 不是 `server/dist/server.js`。systemd unit 指向正确的 main.js; 顶层 `package.json` 的 `npm start` 历史上是坏的 (指向 server.js, 该文件只 export factory 不 listen)。修法是改 package.json 第 8 行, 见 `context/experience/project/tmux_agent/npm-start-points-to-wrong-file.md`。

- **改前端必须 `npm run build` + 浏览器强刷** —— vite 产物 hash 化, 不强刷拿不到新版本。systemd 重启服务**不**触发前端重新构建。

- **service 文件必须有 `KillMode=process`,否则 restart 会带走所有 tmux 会话** —— 不写时 systemd 默认 `KillMode=control-group`,stop 时把 cgroup 里所有进程 SIGTERM。问题在于:tmux server 一旦由 tmux-agent fork 出来(socket 不存在时 `tmux attach-session` 会顺手起 server),就继承 service cgroup → 下次 restart **一锅端 tmux server + 所有 pane 内的 claude / bash / mcp 子进程**。`KillMode=process` 让 stop 只杀 node 主进程,tmux server 和 pane 内进程全活,restart 后新 node 重新 attach。`scripts/install-systemd.sh` 生成的 unit 已包含这行 — 手改 unit 时不要漏。改完跑 `systemctl --user daemon-reload` 才生效。日志里看到 `Found left-over process ... in control group while starting unit. Ignoring.` = 正常,是 KillMode=process 生效的证据。

- **手机端禁键盘弹起** —— xterm 的 `.xterm-helper-textarea` 在触屏要 `tabIndex=-1` + `readOnly=true` + `inputMode='none'` 三件套, 单独 `tabIndex=-1` 拦不住点击 focus。见 `context/experience/general/xterm-touch-block-keyboard.md`。

- **手机端 Enter 语义** —— AttachedComposer 在 `isTouchDevice` 时 Enter = 换行 (textarea 原生), 桌面才是 Enter = send + Shift+Enter = 换行。手机系统输入法的"换行键"发的就是 Enter, 拦了等于断了换行能力。见 `context/experience/general/mobile-textarea-enter-isnt-send.md`。

- **`/` 补全 = Claude Agent SDK `q.supportedCommands()`** —— `slash-sdk.ts:fetchSlashList()` 用**永挂 async iterable** 作 prompt 让 SDK 进 streaming-input 模式但**永不 yield** 用户消息, 然后调 `q.supportedCommands()` 走控制协议从 SDK 初始化状态读 slash 列表 — 0 token、0 Anthropic round-trip、0 Stop hook 触发、~1s 完成。SlashCommand 自带 `description` 所以 SlashMenuItem 的 `desc` 也填充了。⚠️ **不要回退到 `prompt:'x' + for await...break` 那种"假装 abort 在 init 后阻止 prompt 送达"的写法** — AbortController 触发太晚, prompt 仍跑完一整轮 turn, 每次烧 ~25k cache_creation + 5 output tokens + 触发 Stop hook 推一条无链接的企微通知(因为 SDK 子进程没 TMUX_PANE)。server `slash-cache.ts` 用 pane cwd 作 key + 10 分钟 TTL + stale-while-revalidate;前端 composer cache 收 `slash-menu-list` WS 帧填充, 用户打 `/` 走前端 startsWith 过滤,点 🔄 button(header banner)强刷。8 个内置(`/clear /compact /cost /help /resume /agents /model /config`)写死在 `slash-builtin.ts` 与 SDK 返回合并,SDK 优先 dedup。配置 `~/.config/tmux-agent/config.yaml` 的 `commands:` 段已彻底废除。详见 `context/experience/general/claude-agent-sdk-init-message-for-slash-list.md` 和 `context/experience/project/tmux_agent/pty-bytes-not-screen-snapshot.md`(为什么没走 PTY 字节流路)。

- **slash list 重拉靠 PaneMetaPusher 的 cmd 边沿检测,不是定时轮询** —— ws-open 时 prewarm 拉一次。之后由 `pane-meta-pusher.ts` 每 2s 嗅探 active pane 时检测 `lastActiveCmd !== 'claude' && activeCmd === 'claude'` 边沿,触发一次 `pushSlashList(cwd)`。覆盖场景:用户进 ws 时 pane 是 bash,**之后在 pane 里手敲 `claude` 起新实例** → 2s 内自动拉 list 推前端。稳态(claude 一直跑)**不触发**,所以不会每 2s 刷。Bootstrap(`lastActiveCmd === null`)显式跳过,由 pty-bridge prewarm 负责。即使误触发也走 `slash-cache.ts` 的 10 分钟 TTL,不会重打 SDK。要加新的"特定 pane 状态变化触发动作"时复用这个边沿模式,**不要**加独立轮询。

- **`ReconnectingWS.onMessage` 收到的文本帧是已 `JSON.parse` 的 object, 不是 raw string** —— `web/src/ws.ts` 在 callback 上游就 parse 了。新增 WS frame consumer 时判断要写 `typeof data === 'object'` + `data.type === '...'`,不是 `typeof === 'string'` + `JSON.parse(data)`。坑过 c7fd078,详见 `context/experience/project/tmux_agent/ws-onmessage-receives-parsed-object.md`。

- **AttachedView header banner 按钮顺序** —— `← wall | session:id | (spacer) | 🔄 refresh slash | 🐞 debug`。新增 header 按钮按这个左 → 右模式排,跟 `dumpDiag` 同款 4-state(空/loading/ok/err)。

- **upload 文件 7 天自动清** —— `server/src/upload-gc.ts` 启动扫一次 + 每 24h 扫一次。删 mtime > 7 天的文件 + 顺手 rmdir 空目录。无 config 旋钮 (写死)。

- **ScrollControls vs AttachedComposer 分工** —— Esc/Tab/方向键/Yes/No/Ctrl+C/⏎ 在 ScrollControls (已有), composer 不要重复实现功能键。曾经 attached-composer Task 2 撞过这个坑, 撤销了重复的 fnkey 栏。

- **编译验证用 `npm run build`, 不要 `tsc --noEmit`** —— web 子包没装独立 vue-shim.d.ts, 裸 `npx tsc --noEmit` 会报 3 个 `.vue` 模块 implicit any 假阳性 (App.vue / WindowWall.vue / AttachedView.vue), 跟当前改动无关。`npm run build` 走 `vue-tsc -b && vite build`, 能正确处理 `.vue` 文件。implementer subagent 在 plan 里写编译验证步骤时统一用 `npm run build`。server 子包仍可用裸 `tsc --noEmit` (没 .vue 文件)。详见 `context/experience/project/tmux_agent/web-tsc-noemit-vue-false-positives.md`。

- **ScrollControls 的 copy-mode 状态由 AttachedView 下发** —— pane-meta-ws-push task 后, `ScrollControls.inCopyMode` 不再是本地 ref, 是 `AttachedView` 计算的 `activePane?.inMode ?? false` prop。要加新的"跟随 copy-mode 状态显隐 / 禁用"按钮, 从 ScrollControls 的 props 拿, 不要在该组件里自建 ref 跟踪。`toggleHistory` 也不写本地状态, 调 REST 后等 server 推 pane-meta 帧回来更新 prop。

- **tmux 状态有 pane / session / client 三层 scope** —— `pane_in_mode` / `pane_current_command` / cwd 是 pane 级 (全 client 共享, 一个 client 让 pane 进 copy-mode 所有 client 都看到), `select-window` 影响 session 级 active window (跨 client 互相切窗口), 各 client 的 viewport size / 焦点是 client 级。设计任何调 tmux 命令的 RPC / WS 帧时先想清楚 scope, 想要 per-client 隔离 (如让 web 端切 window 不影响电脑直接 attach 的那个 client) 要走 `tmux new-session -t orig -s derived` 派生 grouped session。详见 `context/experience/project/tmux_agent/tmux-state-scope-per-client-vs-shared.md`。

- **agent-state 真相源是 `~/.claude/sessions/<pid>.json`,不是 hook 推送** —— scanner 每 5s tick 时通过 `tmux pane_pid → ps -p <pid> -o comm= 或 pgrep -P <pid> -x claude → claude 子进程 pid → ~/.claude/sessions/<claude_pid>.json` 拿 `{sessionId, name, status: busy|idle, cwd, updatedAt}`。claude 进程实时维护这个文件,`/rename` 设的 name 5s 内可见,无需 hook 触发。实现见 `server/src/claude-session-resolver.ts`。详见 `context/experience/project/tmux_agent/claude-sessions-json-as-realtime-state.md`。

- **AgentState 4 个值各有唯一写入者 + 调和规则** —— `running` / `idle` 由 scanner 写(跟随 `~/.claude/sessions/.status`),`request` 由 hook 写(PermissionRequest / AskUserQuestion,永不衰减),`done` 由 hook 写(Stop 事件,10 分钟后被 scanner 退化到 idle)。改 AgentView 或 registry 前看 `server/src/agent-state-scanner.ts` 的 `reconcileState`,别让 scanner 覆盖 hook 设的事件性状态;hook 也别去写 running/idle 这种 scanner 才知道的字段。

- **hook POST `/api/agent-state` body 只 3 字段** —— `paneId / state / lastMessage`。其他字段(`session / windowId / cwd / claudeSessionId / claudeSessionName / windowName`)全由 server scanner 主动填,hook 不要重新加回去 —— 会跟 scanner 抢字段,且 hook 拿到的可能比 scanner 旧。

## Hook 安装 / 修改流程

WeChat 通知 hook 三件套:

- `docs/notify_wechat.sh` — repo 副本(源真相)
- `scripts/install-wechat-hook.sh` — 一键安装/更新
- `~/.claude/hooks/notify_wechat.env` — 用户私有 webhook URL(gitignore,不入 repo)

**首次安装**:`./scripts/install-wechat-hook.sh https://qyapi.weixin.qq.com/...`

**修改 hook 逻辑**:改 `docs/notify_wechat.sh` → 重跑 install 脚本(URL 会从已有 .env 复用,无需重输)→ commit `docs/notify_wechat.sh` 改动

**只换 webhook URL**:重跑 install 脚本传新 URL

⚠️ 不要直接改 `~/.claude/hooks/notify_wechat.sh` —— 那是 install 脚本的产物,下次重装会覆盖。改 `docs/` 才是源。
