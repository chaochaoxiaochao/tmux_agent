// variants.jsx — four wireframe variants of the tmux-attach AI agent panel
// Each variant exports a React component that renders an SVG artboard.
// Theming respects window.__tweaks (set by app.jsx via TweaksPanel).

const ARTBOARD_W = 1100;
const ARTBOARD_H = 700;

// ── helpers ──────────────────────────────────────────────────
function bg() { return (window.__tweaks?.dark ?? true) ? palette.bg : '#fbf8f1'; }
function bgAlt() { return (window.__tweaks?.dark ?? true) ? palette.bgAlt : '#ece8df'; }
function ink() { return (window.__tweaks?.dark ?? true) ? palette.ink : '#2a2924'; }
function inkDim() { return (window.__tweaks?.dark ?? true) ? palette.inkDim : '#7a7770'; }
function inkFaint() { return (window.__tweaks?.dark ?? true) ? palette.inkFaint : '#bcb8af'; }

// fake agent data
const AGENTS = [
  { name: 'refactor-bot',   status: 'running', cpu: 0.72, mem: 0.41, time: '12m 03s', task: 'splitting auth module' },
  { name: 'test-writer',    status: 'running', cpu: 0.34, mem: 0.22, time: '04m 51s', task: 'covering edge-cases in /api' },
  { name: 'doc-gen',        status: 'idle',    cpu: 0.02, mem: 0.18, time: '—',       task: 'awaiting handoff' },
  { name: 'pr-reviewer',    status: 'warn',    cpu: 0.55, mem: 0.31, time: '08m 22s', task: 'flagged 2 issues' },
  { name: 'migration-fix',  status: 'running', cpu: 0.61, mem: 0.49, time: '21m 47s', task: 'rewriting schema v3' },
  { name: 'lint-runner',    status: 'err',     cpu: 0.00, mem: 0.05, time: '—',       task: 'crashed: ENOENT' },
  { name: 'ci-watcher',     status: 'running', cpu: 0.18, mem: 0.12, time: '02h 14m', task: 'tail -f ci.log' },
  { name: 'sandbox-1',      status: 'idle',    cpu: 0.01, mem: 0.08, time: '—',       task: 'fresh shell' },
];

const SESSIONS = [
  { name: 'main',     count: 5, attached: true },
  { name: 'feat/auth', count: 3, attached: false },
  { name: 'experiments', count: 4, attached: false },
];

const TERMINAL_LINES = [
  { p: '$', t: 'cargo run --bin agent --task refactor' },
  { p: '',  t: '   Compiling agent v0.4.2 (/home/work/agent)', dim: true },
  { p: '',  t: '    Finished dev [unoptimized + debuginfo] target(s) in 3.41s', dim: true },
  { p: '',  t: '     Running `target/debug/agent --task refactor`', dim: true },
  { p: '',  t: '' },
  { p: '>', t: 'parsing src/auth/mod.rs ... 248 lines', color: palette.accent },
  { p: '>', t: 'detected 4 candidate splits → middleware/, jwt/, session/, errors/', color: palette.accent },
  { p: '>', t: 'writing src/auth/middleware.rs (78 lines)' },
  { p: '>', t: 'writing src/auth/jwt.rs (52 lines)' },
  { p: '!', t: 'circular import — src/auth/session.rs ↔ src/auth/mod.rs', color: palette.accent2 },
  { p: '>', t: 'resolving via re-export shim ...' },
  { p: '>', t: 'tests/auth_test.rs · 14/14 passing ✓', color: palette.accent },
  { p: '',  t: '' },
  { p: '$', t: '_' },
];

// ── shared chrome: artboard frame + title ────────────────────
function ArtboardFrame({ children, title, subtitle }) {
  return (
    <div style={{ width: ARTBOARD_W, height: ARTBOARD_H, background: bg(), position: 'relative', overflow: 'hidden', fontFamily: 'Kalam, system-ui' }}>
      <svg width={ARTBOARD_W} height={ARTBOARD_H} viewBox={`0 0 ${ARTBOARD_W} ${ARTBOARD_H}`} style={{ display: 'block' }}>
        {children}
      </svg>
    </div>
  );
}

// ── variant building blocks ──────────────────────────────────

// session selector pill row (top-left)
function SessionRow({ x, y }) {
  return (
    <g>
      <WireText x={x} y={y - 6} size={11} fill={inkDim()} italic>session</WireText>
      {SESSIONS.map((s, i) => {
        const px = x + i * 102;
        return (
          <g key={s.name} transform={`translate(${px}, ${y})`}>
            <WireBox x={0} y={0} w={94} h={24} seed={20 + i} stroke={s.attached ? palette.accent : inkDim()} sw={s.attached ? 1.7 : 1.1} fill={s.attached ? 'rgba(155,210,139,0.08)' : 'none'} />
            {s.attached && <WireDot cx={9} cy={12} r={3} color={palette.accent} pulse />}
            <WireMono x={s.attached ? 18 : 9} y={16} size={10} fill={s.attached ? ink() : inkDim()} weight={s.attached ? 600 : 400}>{s.name}</WireMono>
            <WireMono x={86} y={16} anchor="end" size={9} fill={inkFaint()}>·{s.count}</WireMono>
          </g>
        );
      })}
      <g transform={`translate(${x + SESSIONS.length * 102}, ${y})`}>
        <WireBox x={0} y={0} w={28} h={24} seed={99} stroke={inkFaint()} sw={1} dashed />
        <WireIcon x={7} y={5} size={14} kind="plus" stroke={inkDim()} />
      </g>
    </g>
  );
}

// horizontal tabs row
function TabsRow({ x, y, w, activeIdx = 0, mini = false }) {
  const tabW = mini ? 92 : 108;
  const gap = 4;
  return (
    <g>
      {/* baseline */}
      <WireLine x1={x} y1={y + 24} x2={x + w} y2={y + 24} sw={1} stroke={inkFaint()} seed={50} />
      {AGENTS.slice(0, mini ? 6 : 7).map((a, i) => (
        <g key={a.name} transform={`translate(${x + i * (tabW + gap)}, ${y})`}>
          <WireTab x={0} y={0} w={tabW} h={24} label={a.name} status={a.status} active={i === activeIdx} seed={i + 5} />
        </g>
      ))}
      {/* + new window */}
      <g transform={`translate(${x + (mini ? 6 : 7) * (tabW + gap)}, ${y + 2})`}>
        <WireBox x={0} y={0} w={26} h={22} seed={77} stroke={inkFaint()} sw={1} dashed />
        <WireIcon x={6} y={4} size={14} kind="plus" stroke={inkDim()} />
      </g>
    </g>
  );
}

// status panel (right rail)
function StatusPanel({ x, y, w, h, agent = AGENTS[0] }) {
  return (
    <g>
      <WireBox x={x} y={y} w={w} h={h} seed={130} stroke={inkFaint()} sw={1} fill={bgAlt()} />
      <WireText x={x + 12} y={y + 22} size={16} fill={ink()} weight={700} font="Caveat">agent · {agent.name}</WireText>
      <WireMono x={x + 12} y={y + 40} size={9} fill={inkDim()}>pid 48213 · pty /dev/pts/4</WireMono>
      <WireLine x1={x + 10} y1={y + 50} x2={x + w - 10} y2={y + 50} sw={1} stroke={inkFaint()} seed={131} />

      {/* status pills */}
      <g transform={`translate(${x + 12}, ${y + 64})`}>
        <WirePill x={0} y={0} label="● running" color={palette.accent} seed={132} />
        <WirePill x={86} y={0} label="rust 1.78" color={inkDim()} seed={133} />
      </g>

      {/* metrics */}
      <WireText x={x + 12} y={y + 108} size={12} fill={inkDim()} italic>cpu</WireText>
      <WireBar x={x + 50} y={y + 96} w={w - 70} h={14} value={agent.cpu} color={palette.accent} seed={134} />
      <WireMono x={x + w - 12} y={y + 122} anchor="end" size={9} fill={inkDim()}>{Math.round(agent.cpu * 100)}%</WireMono>

      <WireText x={x + 12} y={y + 144} size={12} fill={inkDim()} italic>mem</WireText>
      <WireBar x={x + 50} y={y + 132} w={w - 70} h={14} value={agent.mem} color={palette.accent2} seed={135} />
      <WireMono x={x + w - 12} y={y + 158} anchor="end" size={9} fill={inkDim()}>{Math.round(agent.mem * 100)}%</WireMono>

      <WireLine x1={x + 10} y1={y + 174} x2={x + w - 10} y2={y + 174} sw={1} stroke={inkFaint()} seed={136} />

      {/* meta */}
      <WireMono x={x + 12} y={y + 192} size={9} fill={inkDim()}>uptime</WireMono>
      <WireMono x={x + w - 12} y={y + 192} anchor="end" size={10} fill={ink()}>{agent.time}</WireMono>
      <WireMono x={x + 12} y={y + 210} size={9} fill={inkDim()}>cwd</WireMono>
      <WireMono x={x + w - 12} y={y + 210} anchor="end" size={9} fill={ink()}>~/work/agent</WireMono>
      <WireMono x={x + 12} y={y + 228} size={9} fill={inkDim()}>branch</WireMono>
      <WireMono x={x + w - 12} y={y + 228} anchor="end" size={9} fill={ink()}>feat/refactor-auth</WireMono>
      <WireMono x={x + 12} y={y + 246} size={9} fill={inkDim()}>tokens</WireMono>
      <WireMono x={x + w - 12} y={y + 246} anchor="end" size={9} fill={ink()}>14.2k / 200k</WireMono>

      <WireLine x1={x + 10} y1={y + 262} x2={x + w - 10} y2={y + 262} sw={1} stroke={inkFaint()} seed={137} />

      {/* current task */}
      <WireText x={x + 12} y={y + 282} size={12} fill={inkDim()} italic>current task</WireText>
      <WireText x={x + 12} y={y + 304} size={14} fill={ink()} weight={500}>"{agent.task}"</WireText>
      <WireScribble x={x + 12} y={y + 324} w={w - 30} seed={138} stroke={inkFaint()} />
      <WireScribble x={x + 12} y={y + 336} w={w - 50} seed={139} stroke={inkFaint()} />

      {/* actions */}
      <g transform={`translate(${x + 12}, ${y + h - 44})`}>
        <WireBtn x={0}  y={0} w={62} h={26} label="pause" seed={140} />
        <WireBtn x={68} y={0} w={62} h={26} label="restart" seed={141} />
        <WireBtn x={136} y={0} w={62} h={26} label="kill" seed={142} stroke={palette.accent3} />
      </g>
    </g>
  );
}

// terminal viewport
function TerminalView({ x, y, w, h, lines = TERMINAL_LINES, title = 'pane 0' }) {
  return (
    <g>
      <WireBox x={x} y={y} w={w} h={h} seed={200} stroke={inkFaint()} sw={1.2} fill={bgAlt()} />
      {/* mini header */}
      <WireLine x1={x} y1={y + 22} x2={x + w} y2={y + 22} sw={1} stroke={inkFaint()} seed={201} />
      <WireDot cx={x + 12} cy={y + 12} r={3} color={palette.accent3} />
      <WireDot cx={x + 22} cy={y + 12} r={3} color={palette.accent2} />
      <WireDot cx={x + 32} cy={y + 12} r={3} color={palette.accent} />
      <WireMono x={x + w / 2} y={y + 15} anchor="middle" size={10} fill={inkDim()}>{title}</WireMono>
      <WireMono x={x + w - 12} y={y + 15} anchor="end" size={9} fill={inkFaint()}>120×34</WireMono>
      {/* output */}
      <g>
        {lines.map((l, i) => (
          <WireTermLine key={i} x={x + 14} y={y + 44 + i * 16} prompt={l.p} text={l.t} dim={l.dim} color={l.color} />
        ))}
      </g>
      {/* blinking cursor */}
      <rect x={x + 22} y={y + 44 + (lines.length - 1) * 16 - 9} width={6} height={11} fill={palette.accent}>
        <animate attributeName="opacity" values="1;0;1" dur="1.1s" repeatCount="indefinite" />
      </rect>
    </g>
  );
}

// annotation: handwritten arrow + note
function Annot({ x, y, dx = 60, dy = -24, label, seed = 1, anchor = 'start' }) {
  if (window.__tweaks && window.__tweaks.showAnnotations === false) return null;
  const ex = x + dx, ey = y + dy;
  return (
    <g opacity={0.85}>
      <WireLine x1={x} y1={y} x2={ex} y2={ey} sw={1.2} stroke={palette.accent2} seed={seed} />
      {/* arrowhead */}
      <path d={`M ${x} ${y} L ${x + Math.sign(dx) * 6} ${y - 3} M ${x} ${y} L ${x + Math.sign(dx) * 6} ${y + 4}`} stroke={palette.accent2} strokeWidth={1.2} strokeLinecap="round" fill="none" />
      <WireText x={ex} y={ey - 6} size={14} fill={palette.accent2} font="Caveat" weight={500} anchor={anchor}>{label}</WireText>
    </g>
  );
}

// ─────────────────────────────────────────────────────────────
// VARIANT A — Classic tabs on top + right rail status
// ─────────────────────────────────────────────────────────────
function VariantA() {
  return (
    <ArtboardFrame>
      {/* paper bg subtle grid */}
      <defs>
        <pattern id="dotsA" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.5" fill={inkFaint()} opacity="0.4" />
        </pattern>
      </defs>
      <rect x="0" y="0" width={ARTBOARD_W} height={ARTBOARD_H} fill="url(#dotsA)" />

      {/* top bar */}
      <WireText x={28} y={36} size={22} fill={ink()} font="Caveat" weight={700}>tmux · agents</WireText>
      <WireMono x={150} y={34} size={10} fill={inkDim()}>~ host: dev-box-02 · 14:22</WireMono>

      {/* right side controls */}
      <g transform="translate(900, 22)">
        <WireBox x={0} y={0} w={150} h={26} seed={2} stroke={inkFaint()} sw={1} />
        <WireIcon x={6} y={6} size={14} kind="search" stroke={inkDim()} />
        <WireMono x={26} y={17} size={10} fill={inkFaint()}>find agent...</WireMono>
        <WireMono x={140} y={17} anchor="end" size={9} fill={inkFaint()}>⌘K</WireMono>
      </g>

      {/* sessions */}
      <g transform="translate(28, 60)">
        <SessionRow x={0} y={0} />
      </g>

      {/* tabs (windows) */}
      <g transform="translate(28, 110)">
        <TabsRow x={0} y={0} w={830} activeIdx={0} />
      </g>

      {/* main split: terminal + right rail */}
      <TerminalView x={28} y={144} w={620} h={500} title="window: refactor-bot · pane 0" />
      <StatusPanel x={668} y={144} w={404} h={500} agent={AGENTS[0]} />

      {/* footer keybind hint */}
      <g transform="translate(28, 660)">
        <WireMono x={0}   y={12} size={10} fill={inkDim()}>⌃b n</WireMono>
        <WireMono x={36}  y={12} size={10} fill={inkFaint()}>next</WireMono>
        <WireMono x={80}  y={12} size={10} fill={inkDim()}>⌃b p</WireMono>
        <WireMono x={116} y={12} size={10} fill={inkFaint()}>prev</WireMono>
        <WireMono x={156} y={12} size={10} fill={inkDim()}>⌃b c</WireMono>
        <WireMono x={192} y={12} size={10} fill={inkFaint()}>new</WireMono>
        <WireMono x={228} y={12} size={10} fill={inkDim()}>⌃b ,</WireMono>
        <WireMono x={264} y={12} size={10} fill={inkFaint()}>rename</WireMono>
        <WireMono x={314} y={12} size={10} fill={inkDim()}>⌃b "</WireMono>
        <WireMono x={350} y={12} size={10} fill={inkFaint()}>split-h</WireMono>
        <WireMono x={400} y={12} size={10} fill={inkDim()}>⌃b %</WireMono>
        <WireMono x={436} y={12} size={10} fill={inkFaint()}>split-v</WireMono>
        <WireMono x={ARTBOARD_W - 30} y={12} anchor="end" size={10} fill={inkFaint()}>8 windows · 1 attached</WireMono>
      </g>

      {/* annotations */}
      <Annot x={140} y={62} dx={120} dy={-32} label="active session →" seed={300} />
      <Annot x={130} y={120} dx={-20} dy={-32} label="status dot" seed={301} anchor="end" />
      <Annot x={870} y={170} dx={-60} dy={-26} label="live metrics" seed={302} anchor="end" />
    </ArtboardFrame>
  );
}

// ─────────────────────────────────────────────────────────────
// VARIANT B — Tabs + bottom dock summary (no right rail)
// ─────────────────────────────────────────────────────────────
function VariantB() {
  return (
    <ArtboardFrame>
      <WireText x={28} y={36} size={22} fill={ink()} font="Caveat" weight={700}>agent fleet</WireText>
      <WireMono x={140} y={34} size={10} fill={inkDim()}>session: main · 8 agents · 4 running</WireMono>

      <g transform="translate(820, 22)">
        <WireBtn x={0} y={0} w={70} h={26} label="+ window" seed={2} />
        <WireBtn x={76} y={0} w={70} h={26} label="split" seed={3} />
        <WireBtn x={152} y={0} w={70} h={26} label="kill all" seed={4} stroke={palette.accent3} />
      </g>

      {/* sessions inline */}
      <g transform="translate(28, 56)">
        <SessionRow x={0} y={0} />
      </g>

      {/* tab strip — full width */}
      <g transform="translate(28, 104)">
        <TabsRow x={0} y={0} w={1044} activeIdx={1} />
      </g>

      {/* terminal — wide */}
      <TerminalView x={28} y={138} w={1044} h={420} title="test-writer · pane 0" lines={[
        { p: '$', t: 'pytest tests/api -v --tb=short' },
        { p: '',  t: '======================== test session starts ========================', dim: true },
        { p: '',  t: 'collected 47 items', dim: true },
        { p: '',  t: '' },
        { p: '',  t: 'tests/api/test_auth.py::test_login_ok PASSED', color: palette.accent },
        { p: '',  t: 'tests/api/test_auth.py::test_login_bad_pw PASSED', color: palette.accent },
        { p: '',  t: 'tests/api/test_auth.py::test_token_refresh PASSED', color: palette.accent },
        { p: '',  t: 'tests/api/test_users.py::test_list_users PASSED', color: palette.accent },
        { p: '',  t: 'tests/api/test_users.py::test_create_user FAILED', color: palette.accent3 },
        { p: '',  t: '    > assert resp.status_code == 201', dim: true },
        { p: '',  t: '    E   assert 500 == 201', dim: true },
        { p: '',  t: '' },
        { p: '>', t: 'agent: writing tests/api/test_users_edge.py ...', color: palette.accent },
        { p: '>', t: 'agent: covering null payload, oversized body, unicode names', color: palette.accent },
        { p: '$', t: '_' },
      ]} />

      {/* bottom dock: agent grid summary */}
      <g transform="translate(28, 574)">
        <WireText x={0} y={-6} size={11} fill={inkDim()} italic>all agents (drag to reorder · click to attach)</WireText>
        {AGENTS.map((a, i) => {
          const col = i % 4, row = Math.floor(i / 4);
          const cw = 256, ch = 44;
          return (
            <g key={a.name} transform={`translate(${col * (cw + 6)}, ${row * (ch + 6)})`}>
              <WireBox x={0} y={0} w={cw} h={ch} seed={400 + i} stroke={i === 1 ? palette.accent : inkFaint()} sw={i === 1 ? 1.7 : 1} fill={i === 1 ? 'rgba(155,210,139,0.06)' : 'none'} />
              <WireDot cx={14} cy={ch / 2} r={3.4} color={a.status === 'running' ? palette.accent : a.status === 'warn' ? palette.accent2 : a.status === 'err' ? palette.accent3 : inkFaint()} pulse={a.status === 'running'} />
              <WireMono x={26} y={18} size={10} fill={ink()} weight={500}>{a.name}</WireMono>
              <WireMono x={26} y={32} size={9} fill={inkDim()}>{a.task}</WireMono>
              <WireMono x={cw - 10} y={18} anchor="end" size={9} fill={inkDim()}>cpu {Math.round(a.cpu * 100)}%</WireMono>
              <WireMono x={cw - 10} y={32} anchor="end" size={9} fill={inkFaint()}>{a.time}</WireMono>
            </g>
          );
        })}
      </g>

      <Annot x={250} y={106} dx={120} dy={-30} label="active = solid tab" seed={310} />
      <Annot x={400} y={580} dx={20} dy={-22} label="click any → attach" seed={311} />
    </ArtboardFrame>
  );
}

// ─────────────────────────────────────────────────────────────
// VARIANT C — Sidebar tree (sessions › windows) + main terminal
// ─────────────────────────────────────────────────────────────
function VariantC() {
  return (
    <ArtboardFrame>
      <WireText x={28} y={36} size={22} fill={ink()} font="Caveat" weight={700}>tmux navigator</WireText>

      {/* left sidebar */}
      <WireBox x={20} y={56} w={260} h={ARTBOARD_H - 80} seed={500} stroke={inkFaint()} sw={1} fill={bgAlt()} />

      {/* sidebar search */}
      <g transform="translate(32, 70)">
        <WireBox x={0} y={0} w={236} h={24} seed={501} stroke={inkFaint()} sw={1} />
        <WireIcon x={6} y={5} size={14} kind="search" stroke={inkDim()} />
        <WireMono x={26} y={16} size={10} fill={inkFaint()}>filter agents...</WireMono>
      </g>

      {/* tree */}
      <g transform="translate(32, 108)">
        {SESSIONS.map((s, si) => {
          const yOff = si === 0 ? 0 : si === 1 ? 196 : 280;
          const open = si === 0; // first session open
          return (
            <g key={s.name} transform={`translate(0, ${yOff})`}>
              <WireMono x={0} y={12} size={10} fill={ink()} weight={700}>{open ? '▾' : '▸'} {s.name}</WireMono>
              <WireMono x={236} y={12} anchor="end" size={9} fill={inkFaint()}>{s.count}w</WireMono>
              {open && AGENTS.slice(0, 8).map((a, i) => {
                const sel = i === 0;
                return (
                  <g key={a.name} transform={`translate(8, ${22 + i * 20})`}>
                    {sel && <WireBox x={-4} y={-2} w={232} h={20} seed={510 + i} stroke="none" fill="rgba(155,210,139,0.10)" />}
                    <WireDot cx={4} cy={8} r={3} color={a.status === 'running' ? palette.accent : a.status === 'warn' ? palette.accent2 : a.status === 'err' ? palette.accent3 : inkFaint()} pulse={a.status === 'running' && sel} />
                    <WireMono x={14} y={12} size={10} fill={sel ? ink() : inkDim()} weight={sel ? 600 : 400}>{a.name}</WireMono>
                    <WireMono x={224} y={12} anchor="end" size={9} fill={inkFaint()}>{a.time}</WireMono>
                  </g>
                );
              })}
            </g>
          );
        })}
      </g>

      {/* sidebar footer */}
      <g transform={`translate(32, ${ARTBOARD_H - 60})`}>
        <WireBtn x={0} y={0} w={114} h={26} label="+ session" seed={520} />
        <WireBtn x={120} y={0} w={114} h={26} label="+ window" seed={521} />
      </g>

      {/* main area */}
      <g transform="translate(296, 56)">
        {/* breadcrumb */}
        <WireMono x={0} y={14} size={10} fill={inkDim()}>main / refactor-bot / pane 0</WireMono>
        <g transform="translate(540, 0)">
          <WirePill x={0}   y={0} label="● running" color={palette.accent} seed={530} />
          <WirePill x={86}  y={0} label="cpu 72%" color={inkDim()} seed={531} />
          <WirePill x={158} y={0} label="12m" color={inkDim()} seed={532} />
          <WireBtn  x={232} y={-3} w={56} h={22} label="detail" seed={533} />
        </g>

        {/* split panes inside the window */}
        <WireMono x={0} y={42} size={10} fill={inkFaint()}>panes ↓ (split layout: main-vertical)</WireMono>

        {/* pane 0 */}
        <g transform="translate(0, 54)">
          <TerminalView x={0} y={0} w={520} h={420} title="pane 0 · 78×34" />
        </g>
        {/* pane 1 (right top) */}
        <g transform="translate(528, 54)">
          <TerminalView x={0} y={0} w={252} h={206} title="pane 1 · top" lines={[
            { p: '$', t: 'htop -p 48213' },
            { p: '',  t: 'CPU%  72.4', color: palette.accent },
            { p: '',  t: 'MEM%  41.0' },
            { p: '',  t: 'TIME  12:03' },
            { p: '',  t: '' },
            { p: '',  t: 'rss   312 MB', dim: true },
            { p: '',  t: 'thr   8', dim: true },
            { p: '',  t: 'fds   24', dim: true },
            { p: '',  t: '' },
            { p: '',  t: '↑↑↑▂▃▅▇▆▄▃', color: palette.accent },
          ]} />
          <WireMono x={0} y={222} size={9} fill={palette.accent}>● active</WireMono>
        </g>
        {/* pane 2 (right bottom) */}
        <g transform="translate(528, 268)">
          <TerminalView x={0} y={0} w={252} h={206} title="pane 2 · bottom" lines={[
            { p: '$', t: 'tail -f log/agent.log' },
            { p: '',  t: '14:22:01 step → parse', dim: true },
            { p: '',  t: '14:22:03 step → split' },
            { p: '',  t: '14:22:09 wrote middleware.rs' },
            { p: '',  t: '14:22:11 wrote jwt.rs' },
            { p: '',  t: '14:22:14 ! cycle import', color: palette.accent2 },
            { p: '',  t: '14:22:16 step → reexport' },
            { p: '',  t: '14:22:21 tests 14/14 ✓', color: palette.accent },
            { p: '',  t: '...' },
          ]} />
        </g>
      </g>

      <Annot x={36} y={130} dx={-8} dy={-26} label="tree of agents" seed={540} anchor="start" />
      <Annot x={820} y={110} dx={-80} dy={-30} label="splits ≡ panes" seed={541} anchor="end" />
    </ArtboardFrame>
  );
}

// ─────────────────────────────────────────────────────────────
// VARIANT D — Dashboard grid: every window as a live tile
// ─────────────────────────────────────────────────────────────
function VariantD() {
  const tiles = AGENTS.slice(0, 8);
  return (
    <ArtboardFrame>
      <WireText x={28} y={36} size={22} fill={ink()} font="Caveat" weight={700}>agent wall</WireText>
      <WireMono x={150} y={34} size={10} fill={inkDim()}>session: main · grid view · click any tile → attach fullscreen</WireMono>

      <g transform="translate(740, 22)">
        <WireBtn x={0} y={0} w={64} h={26} label="grid" seed={600} active />
        <WireBtn x={70} y={0} w={64} h={26} label="tabs" seed={601} />
        <WireBtn x={140} y={0} w={64} h={26} label="tree" seed={602} />
        <WireBtn x={216} y={0} w={120} h={26} label="+ new agent" seed={603} />
      </g>

      <g transform="translate(28, 64)">
        <SessionRow x={0} y={0} />
      </g>

      {/* grid 4×2 */}
      <g transform="translate(28, 116)">
        {tiles.map((a, i) => {
          const col = i % 4, row = Math.floor(i / 4);
          const tw = 254, th = 252;
          const x = col * (tw + 8);
          const y = row * (th + 12);
          const sel = i === 0;
          const dotColor = a.status === 'running' ? palette.accent : a.status === 'warn' ? palette.accent2 : a.status === 'err' ? palette.accent3 : inkFaint();
          return (
            <g key={a.name} transform={`translate(${x}, ${y})`}>
              <WireBox x={0} y={0} w={tw} h={th} seed={700 + i} stroke={sel ? palette.accent : inkFaint()} sw={sel ? 1.8 : 1} fill={bgAlt()} />
              {/* tile header */}
              <WireLine x1={0} y1={28} x2={tw} y2={28} sw={1} stroke={inkFaint()} seed={701 + i} />
              <WireDot cx={12} cy={14} r={3.4} color={dotColor} pulse={a.status === 'running'} />
              <WireMono x={22} y={18} size={10} fill={ink()} weight={600}>{a.name}</WireMono>
              <WireMono x={tw - 10} y={18} anchor="end" size={9} fill={inkFaint()}>{a.time}</WireMono>

              {/* mini terminal preview */}
              <g>
                <WireMono x={10} y={46} size={8.5} fill={inkDim()}>$ {a.task.slice(0, 30)}</WireMono>
                {[0, 1, 2, 3, 4, 5].map(k => (
                  <WireScribble key={k} x={10} y={62 + k * 12} w={tw - 24 - (k === 5 ? 80 : 0)} seed={750 + i * 10 + k} stroke={inkFaint()} opacity={0.55 - k * 0.04} />
                ))}
                {a.status === 'err' && (
                  <WireMono x={10} y={62 + 6 * 12} size={9} fill={palette.accent3}>! crashed: ENOENT</WireMono>
                )}
                {a.status === 'idle' && (
                  <WireMono x={10} y={62 + 6 * 12} size={9} fill={inkFaint()} italic>(idle — no recent output)</WireMono>
                )}
              </g>

              {/* footer metrics */}
              <WireLine x1={0} y1={th - 36} x2={tw} y2={th - 36} sw={1} stroke={inkFaint()} seed={780 + i} />
              <WireMono x={10} y={th - 22} size={9} fill={inkDim()}>cpu</WireMono>
              <WireBar x={32} y={th - 28} w={70} h={10} value={a.cpu} color={palette.accent} seed={790 + i} />
              <WireMono x={108} y={th - 22} size={9} fill={inkDim()}>mem</WireMono>
              <WireBar x={130} y={th - 28} w={60} h={10} value={a.mem} color={palette.accent2} seed={795 + i} />
              <WireMono x={tw - 10} y={th - 22} anchor="end" size={9} fill={inkDim()}>attach →</WireMono>
            </g>
          );
        })}
      </g>

      <Annot x={150} y={140} dx={-10} dy={-30} label="live preview · 1Hz" seed={800} anchor="start" />
      <Annot x={780} y={140} dx={-80} dy={-30} label="green border = attached" seed={801} anchor="end" />
    </ArtboardFrame>
  );
}

Object.assign(window, { VariantA, VariantB, VariantC, VariantD, VariantDAttached, ARTBOARD_W, ARTBOARD_H });

// ─────────────────────────────────────────────────────────────
// VARIANT D-ATTACHED — after clicking a tile in D, the agent goes fullscreen
// Shows: breadcrumb back to wall · big terminal · status rail · mini fleet strip
// ─────────────────────────────────────────────────────────────
function VariantDAttached() {
  const a = AGENTS[0]; // refactor-bot
  return (
    <ArtboardFrame>
      <defs>
        <pattern id="dotsDA" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.5" fill={inkFaint()} opacity="0.4" />
        </pattern>
      </defs>
      <rect x="0" y="0" width={ARTBOARD_W} height={ARTBOARD_H} fill="url(#dotsDA)" />

      {/* top bar: back + breadcrumb + actions */}
      <g transform="translate(28, 22)">
        {/* back to wall button */}
        <WireBox x={0} y={0} w={108} h={28} seed={900} stroke={inkDim()} sw={1.2} />
        <path d={`M 12 14 L 18 9 M 12 14 L 18 19 M 12 14 L 28 14`} stroke={inkDim()} strokeWidth={1.4} fill="none" strokeLinecap="round" />
        <WireMono x={34} y={18} size={10} fill={ink()}>back to wall</WireMono>

        {/* breadcrumb */}
        <WireMono x={124} y={12} size={10} fill={inkDim()}>main</WireMono>
        <WireMono x={156} y={12} size={10} fill={inkFaint()}>›</WireMono>
        <WireMono x={166} y={12} size={10} fill={inkDim()}>refactor-bot</WireMono>
        <WireMono x={244} y={12} size={10} fill={inkFaint()}>›</WireMono>
        <WireMono x={254} y={12} size={10} fill={ink()} weight={600}>pane 0</WireMono>
        <WireText x={124} y={26} size={11} fill={inkFaint()} italic>attached · keystrokes go to this agent</WireText>
      </g>

      {/* status pills + actions on the right */}
      <g transform="translate(560, 22)">
        <WirePill x={0}   y={4} label="● running" color={palette.accent} seed={910} />
        <WirePill x={86}  y={4} label="12m 03s" color={inkDim()} seed={911} />
        <WirePill x={158} y={4} label="cpu 72%" color={inkDim()} seed={912} />
        <WirePill x={230} y={4} label="mem 41%" color={inkDim()} seed={913} />
      </g>
      <g transform="translate(880, 22)">
        <WireBtn x={0}  y={0} w={56} h={26} label="split" seed={920} />
        <WireBtn x={62} y={0} w={56} h={26} label="pause" seed={921} />
        <WireBtn x={124} y={0} w={56} h={26} label="kill" seed={922} stroke={palette.accent3} />
      </g>

      {/* main terminal — big */}
      <g transform="translate(28, 70)">
        <TerminalView x={0} y={0} w={780} h={500} title={`${a.name} · pane 0 · 142×40`} lines={[
          { p: '$', t: 'cargo run --bin agent --task refactor' },
          { p: '',  t: '   Compiling agent v0.4.2 (/home/work/agent)', dim: true },
          { p: '',  t: '    Finished dev [unoptimized + debuginfo] target(s) in 3.41s', dim: true },
          { p: '',  t: '     Running `target/debug/agent --task refactor`', dim: true },
          { p: '',  t: '' },
          { p: '>', t: 'parsing src/auth/mod.rs ... 248 lines', color: palette.accent },
          { p: '>', t: 'detected 4 candidate splits → middleware/, jwt/, session/, errors/', color: palette.accent },
          { p: '>', t: 'writing src/auth/middleware.rs (78 lines)' },
          { p: '>', t: 'writing src/auth/jwt.rs    (52 lines)' },
          { p: '>', t: 'writing src/auth/session.rs (94 lines)' },
          { p: '>', t: 'writing src/auth/errors.rs (24 lines)' },
          { p: '!', t: 'circular import — src/auth/session.rs ↔ src/auth/mod.rs', color: palette.accent2 },
          { p: '>', t: 'resolving via re-export shim ...' },
          { p: '>', t: '  · adding pub use to mod.rs', dim: true },
          { p: '>', t: '  · trimming session.rs to use crate::auth::*', dim: true },
          { p: '>', t: 'cargo check ... ok', color: palette.accent },
          { p: '>', t: 'tests/auth_test.rs · 14/14 passing ✓', color: palette.accent },
          { p: '>', t: 'diff stat · 4 files +248 −172', color: palette.accent },
          { p: '',  t: '' },
          { p: '?', t: 'commit & open PR? [y/N]', color: palette.accent2 },
          { p: '$', t: 'y_' },
        ]} />
      </g>

      {/* right side: status panel */}
      <g transform="translate(820, 70)">
        <StatusPanel x={0} y={0} w={252} h={500} agent={a} />
      </g>

      {/* bottom: mini strip of fleet to switch */}
      <g transform="translate(28, 590)">
        <WireText x={0} y={-6} size={11} fill={inkDim()} italic>switch agent · ⌃b 0–9</WireText>
        {AGENTS.slice(0, 8).map((ag, i) => {
          const tw = 126, gap = 6;
          const sel = i === 0;
          const dotColor = ag.status === 'running' ? palette.accent : ag.status === 'warn' ? palette.accent2 : ag.status === 'err' ? palette.accent3 : inkFaint();
          return (
            <g key={ag.name} transform={`translate(${i * (tw + gap)}, 0)`}>
              <WireBox x={0} y={0} w={tw} h={62} seed={930 + i} stroke={sel ? palette.accent : inkFaint()} sw={sel ? 1.7 : 1} fill={sel ? 'rgba(155,210,139,0.08)' : bgAlt()} />
              <WireDot cx={10} cy={12} r={3} color={dotColor} pulse={ag.status === 'running' && sel} />
              <WireMono x={20} y={15} size={9} fill={sel ? ink() : inkDim()} weight={sel ? 600 : 400}>{ag.name}</WireMono>
              <WireMono x={tw - 8} y={15} anchor="end" size={8} fill={inkFaint()}>{i}</WireMono>
              {/* mini sparkline of recent output */}
              {[0, 1, 2].map(k => (
                <WireScribble key={k} x={8} y={28 + k * 9} w={tw - 16 - (k === 2 ? 30 : 0)} seed={940 + i * 10 + k} stroke={inkFaint()} opacity={0.5 - k * 0.08} />
              ))}
              <WireMono x={tw - 8} y={56} anchor="end" size={8} fill={inkFaint()}>{ag.time}</WireMono>
            </g>
          );
        })}
      </g>

      <Annot x={108} y={50} dx={60} dy={28} label="back ↩ wall view" seed={950} />
      <Annot x={290} y={460} dx={120} dy={-200} label="full terminal · attached input" seed={951} />
      <Annot x={56} y={604} dx={20} dy={-22} label="press 0–9 to hop" seed={952} />
    </ArtboardFrame>
  );
}
