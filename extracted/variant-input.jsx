// variant-input.jsx — unified bottom input bar with layered keybinds
// Layered keybind strategy:
//   1. Contextual (Y/N/A/↵/↑↓) — float just above the bar, only when a prompt is detected
//   2. Modifier hint (⌥ held) — inline in the bar, replaces send-hint area
//   3. Cheatsheet (⌃b ...)    — collapsed behind a "?" button on the bar's left side, expands upward

function VariantInput() {
  return (
    <ArtboardFrame>
      <defs>
        <pattern id="dotsIN" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.5" fill={inkFaint()} opacity="0.4" />
        </pattern>
      </defs>
      <rect x="0" y="0" width={ARTBOARD_W} height={ARTBOARD_H} fill="url(#dotsIN)" />

      <WireText x={28} y={36} size={22} fill={ink()} font="Caveat" weight={700}>unified input bar · layered shortcuts</WireText>
      <WireMono x={420} y={34} size={10} fill={inkDim()}>attached: refactor-bot</WireMono>

      {/* legend at top right */}
      <g transform="translate(720, 22)">
        <WireMono x={0} y={12} size={9} fill={inkDim()}>① contextual</WireMono>
        <WireDot cx={84} cy={9} r={3} color={palette.accent2} />
        <WireMono x={92} y={12} size={9} fill={inkDim()}>② modifier hint</WireMono>
        <WireDot cx={188} cy={9} r={3} color={palette.accent} />
        <WireMono x={196} y={12} size={9} fill={inkDim()}>③ cheatsheet (collapsed)</WireMono>
        <WireDot cx={332} cy={9} r={3} color={inkDim()} />
      </g>

      {/* ── attached terminal preview, bottom-anchored prompt ── */}
      <g transform="translate(28, 60)">
        <TerminalView x={0} y={0} w={1044} h={350} title="refactor-bot · pane 0 · 142×30" lines={[
          { p: '>', t: 'parsing src/auth/mod.rs ... 248 lines', color: palette.accent },
          { p: '>', t: 'detected 4 candidate splits → middleware/, jwt/, session/, errors/', color: palette.accent },
          { p: '>', t: 'writing src/auth/middleware.rs (78 lines)' },
          { p: '>', t: 'writing src/auth/jwt.rs    (52 lines)' },
          { p: '>', t: 'writing src/auth/session.rs (94 lines)' },
          { p: '>', t: 'tests/auth_test.rs · 14/14 passing ✓', color: palette.accent },
          { p: '',  t: '' },
          { p: '',  t: '╭──────────────────────────────────────────╮', dim: true },
          { p: '',  t: '│  Apply this edit to src/auth/mod.rs?      │', color: palette.accent2 },
          { p: '',  t: '│                                            │', dim: true },
          { p: '',  t: '│  ❯ 1. Yes                                  │' },
          { p: '',  t: '│    2. Yes, and don\u2019t ask again this session│', dim: true },
          { p: '',  t: '│    3. No, and tell Claude what to do diff. │', dim: true },
          { p: '',  t: '╰──────────────────────────────────────────╯', dim: true },
        ]} />
      </g>

      {/* ── ① CONTEXTUAL FLOATING KEYS (above the bar, only when prompt detected) ── */}
      <g transform="translate(28, 432)">
        {/* container — yellowish dashed to feel "alert / temporary" */}
        <WireBox x={0} y={0} w={1044} h={56} seed={1300} stroke={palette.accent2} sw={1.5} fill={'rgba(232,184,109,0.06)'} dashed />
        <WireMono x={14} y={18} size={9} fill={palette.accent2} weight={700}>● prompt detected · single-key actions (no modifier needed)</WireMono>
        <g transform="translate(14, 26)">
          {[
            { k: 'Y', label: 'yes',          color: palette.accent },
            { k: 'N', label: 'no',           color: palette.accent3 },
            { k: 'A', label: 'always · session', color: palette.accent },
            { k: '1·2·3', label: 'pick option', color: ink() },
            { k: '↑↓', label: 'move',        color: inkDim() },
            { k: '↵',  label: 'confirm hi-lit', color: ink() },
            { k: '⎋',  label: 'cancel',      color: inkDim() },
          ].map((s, i) => (
            <g key={s.k} transform={`translate(${i * 145}, 0)`}>
              <WireBox x={0} y={0} w={s.k === '1·2·3' ? 44 : 32} h={22} seed={1310 + i} stroke={s.color} sw={1.5} fill={'rgba(255,255,255,0.02)'} />
              <WireMono x={(s.k === '1·2·3' ? 44 : 32) / 2} y={15} anchor="middle" size={10} fill={s.color} weight={700}>{s.k}</WireMono>
              <WireMono x={(s.k === '1·2·3' ? 50 : 38)} y={15} size={10} fill={ink()}>{s.label}</WireMono>
            </g>
          ))}
        </g>
      </g>

      {/* ── ③ CHEATSHEET DRAWER (drawn expanded above the bar to demo the open state) ── */}
      <g transform="translate(28, 504)">
        <WireBox x={0} y={0} w={384} h={86} seed={1700} stroke={inkFaint()} sw={1.2} fill={bgAlt()} />
        {/* little tail down to the ? button */}
        <path d={`M 22 86 L 26 92 L 30 86 Z`} fill={bgAlt()} stroke={inkFaint()} strokeWidth={1} />
        <WireMono x={14} y={18} size={9} fill={inkDim()} weight={600}>tmux shortcuts (⌃b prefix)</WireMono>
        <WireMono x={370} y={18} anchor="end" size={9} fill={inkFaint()}>? close</WireMono>
        <WireLine x1={0} y1={24} x2={384} y2={24} sw={1} stroke={inkFaint()} seed={1701} />
        {[
          { k: '⌃b 0-9', label: 'jump to window' },
          { k: '⌃b n/p', label: 'next / prev' },
          { k: '⌃b c',   label: 'new window' },
          { k: '⌃b "',   label: 'split horizontal' },
          { k: '⌃b %',   label: 'split vertical' },
          { k: '⌃b d',   label: 'detach' },
        ].map((s, i) => {
          const col = i % 2, row = Math.floor(i / 2);
          return (
            <g key={s.k} transform={`translate(${14 + col * 184}, ${36 + row * 18})`}>
              <WireMono x={0} y={10} size={9} fill={ink()} weight={600}>{s.k}</WireMono>
              <WireMono x={62} y={10} size={9} fill={inkDim()}>{s.label}</WireMono>
            </g>
          );
        })}
      </g>

      {/* ── UNIFIED BOTTOM BAR ── */}
      <g transform="translate(28, 600)">
        <WireBox x={0} y={0} w={1044} h={76} seed={1400} stroke={inkFaint()} sw={1.2} fill={bgAlt()} />

        {/* [?] cheatsheet trigger (left edge) */}
        <g transform="translate(12, 12)">
          <WireBox x={0} y={0} w={32} h={52} seed={1401} stroke={palette.accent} sw={1.4} fill={'rgba(155,210,139,0.08)'} />
          <WireMono x={16} y={32} anchor="middle" size={14} fill={palette.accent} weight={700}>?</WireMono>
        </g>

        {/* @ mention */}
        <g transform="translate(54, 12)">
          <WireBox x={0} y={0} w={32} h={52} seed={1402} stroke={inkFaint()} sw={1.1} />
          <WireMono x={16} y={32} anchor="middle" size={14} fill={inkDim()} weight={700}>@</WireMono>
        </g>

        {/* pill input */}
        <g transform="translate(96, 12)">
          <path d={(() => {
            const w = 778, h = 52, r = 26;
            return `M ${r} 0 L ${w - r} 0 A ${r} ${r} 0 0 1 ${w - r} ${h} L ${r} ${h} A ${r} ${r} 0 0 1 ${r} 0 Z`;
          })()} fill={'rgba(255,255,255,0.02)'} stroke={inkFaint()} strokeWidth={1.3} />
          <path d={(() => {
            const w = 778, h = 52, r = 26, j = 0.6;
            return `M ${r + j} ${0 - j} L ${w - r - j} ${0 + j} A ${r} ${r} 0 0 1 ${w - r + j} ${h - j} L ${r - j} ${h + j} A ${r} ${r} 0 0 1 ${r + j} ${0 + j} Z`;
          })()} fill="none" stroke={inkFaint()} strokeWidth={0.8} opacity={0.5} />
          <WireMono x={24} y={32} size={12} fill={ink()}>also rename `Auth` → `AuthService` and keep old name as alias</WireMono>
          <rect x={494} y={22} width={6} height={14} fill={palette.accent}>
            <animate attributeName="opacity" values="1;0;1" dur="1.1s" repeatCount="indefinite" />
          </rect>

          {/* ② INLINE MODIFIER HINT (right side of pill) — replaces "/cmd · @file" hint */}
          <g transform="translate(630, 14)">
            <WireBox x={0} y={0} w={140} h={24} seed={1410} stroke={palette.accent2} sw={1.3} fill={'rgba(232,184,109,0.10)'} />
            <WireDot cx={10} cy={12} r={3} color={palette.accent2} pulse />
            <WireMono x={20} y={16} size={9} fill={palette.accent2} weight={700}>⌥ held → talk</WireMono>
          </g>
        </g>

        {/* mic */}
        <g transform="translate(884, 12)">
          <circle cx={26} cy={26} r={26} fill={palette.accent3} opacity={0.18} />
          <circle cx={26} cy={26} r={26} fill="none" stroke={palette.accent3} strokeWidth={1.6} />
          <rect x={22} y={16} width={8} height={14} rx={4} fill={palette.accent3} />
          <path d={`M 16 28 Q 26 38 36 28`} stroke={palette.accent3} strokeWidth={1.5} fill="none" strokeLinecap="round" />
          <line x1={26} y1={38} x2={26} y2={44} stroke={palette.accent3} strokeWidth={1.5} />
        </g>

        {/* send */}
        <g transform="translate(948, 12)">
          <WireBox x={0} y={0} w={84} h={52} seed={1430} stroke={palette.accent} sw={1.7} fill={'rgba(155,210,139,0.10)'} />
          <WireMono x={42} y={32} anchor="middle" size={12} fill={palette.accent} weight={700}>send ⏎</WireMono>
        </g>
      </g>

      {/* annotations */}
      <Annot x={250} y={448} dx={-30} dy={-26} label="① only when prompt is on screen" seed={1800} />
      <Annot x={44} y={604} dx={-20} dy={28} label="③ ?-button → cheatsheet drawer" seed={1801} />
      <Annot x={770} y={624} dx={36} dy={-30} label="② live modifier feedback" seed={1802} />
      <Annot x={520} y={690} dx={0} dy={-12} label="single bar — text + voice + send" seed={1803} anchor="middle" />
    </ArtboardFrame>
  );
}

Object.assign(window, { VariantInput });
