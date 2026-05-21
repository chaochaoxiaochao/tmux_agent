# tmux-agent

浏览器里使用 tmux 的轻量 web 化客户端 (Vue 3 + TS 前端 + Fastify Node 后端 monorepo)。每个 tile = 一个 tmux window, 点开是全屏 xterm + AttachedComposer (输入条) + ScrollControls (功能键)。

## Commands

| Command | Description |
|---------|-------------|
| `npm run build` | 全量构建 web + server (顶层 workspace 命令) |
| `cd web && npm run build` | 只构建前端 (改 .vue / 前端 .ts 后必跑, 浏览器还要强刷) |
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
    tmux-control.ts     # 通过 tmux 命令行 + pipe-pane 跟 tmux 交互 (PaneMeta 含 cwd / cmd / size / active)
    pty-bridge.ts       # node-pty + WS 桥, 把 tmux pane 字节流推给浏览器 + ws-open 时调 getSlashList 预热 slash list
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

- **手机端禁键盘弹起** —— xterm 的 `.xterm-helper-textarea` 在触屏要 `tabIndex=-1` + `readOnly=true` + `inputMode='none'` 三件套, 单独 `tabIndex=-1` 拦不住点击 focus。见 `context/experience/general/xterm-touch-block-keyboard.md`。

- **手机端 Enter 语义** —— AttachedComposer 在 `isTouchDevice` 时 Enter = 换行 (textarea 原生), 桌面才是 Enter = send + Shift+Enter = 换行。手机系统输入法的"换行键"发的就是 Enter, 拦了等于断了换行能力。见 `context/experience/general/mobile-textarea-enter-isnt-send.md`。

- **`/` 补全 = Claude Agent SDK init message** —— 用 `@anthropic-ai/claude-agent-sdk` 短命子进程读 `system/init` 拿 `slash_commands` 字段, 复用本地 OAuth (apiKeySource: none, 0 token, 本地工作)。server `slash-cache.ts` 用 pane cwd 作 key + 10 分钟 TTL + stale-while-revalidate;前端 composer cache 收 `slash-menu-list` WS 帧填充, 用户打 `/` 走前端 startsWith 过滤,点 🔄 button(header banner)强刷。8 个内置(`/clear /compact /cost /help /resume /agents /model /config`)写死在 `slash-builtin.ts` 与 SDK 返回合并,SDK 优先 dedup。配置 `~/.config/tmux-agent/config.yaml` 的 `commands:` 段已彻底废除。详见 `context/experience/general/claude-agent-sdk-init-message-for-slash-list.md` 和 `context/experience/project/tmux_agent/pty-bytes-not-screen-snapshot.md`(为什么没走 PTY 字节流路)。

- **`ReconnectingWS.onMessage` 收到的文本帧是已 `JSON.parse` 的 object, 不是 raw string** —— `web/src/ws.ts` 在 callback 上游就 parse 了。新增 WS frame consumer 时判断要写 `typeof data === 'object'` + `data.type === '...'`,不是 `typeof === 'string'` + `JSON.parse(data)`。坑过 c7fd078,详见 `context/experience/project/tmux_agent/ws-onmessage-receives-parsed-object.md`。

- **AttachedView header banner 按钮顺序** —— `← wall | session:id | (spacer) | 🔄 refresh slash | 🐞 debug`。新增 header 按钮按这个左 → 右模式排,跟 `dumpDiag` 同款 4-state(空/loading/ok/err)。

- **upload 文件 7 天自动清** —— `server/src/upload-gc.ts` 启动扫一次 + 每 24h 扫一次。删 mtime > 7 天的文件 + 顺手 rmdir 空目录。无 config 旋钮 (写死)。

- **ScrollControls vs AttachedComposer 分工** —— Esc/Tab/方向键/Yes/No/Ctrl+C/⏎ 在 ScrollControls (已有), composer 不要重复实现功能键。曾经 attached-composer Task 2 撞过这个坑, 撤销了重复的 fnkey 栏。
