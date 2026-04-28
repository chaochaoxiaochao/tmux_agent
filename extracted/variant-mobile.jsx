// variant-mobile.jsx — responsive: same page works on web + mobile
// Three artboards laid out side by side: desktop / tablet / mobile

function VariantResponsive() {
  return (
    <ArtboardFrame>
      <defs>
        <pattern id="dotsR" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.5" fill={inkFaint()} opacity="0.4" />
        </pattern>
      </defs>
      <rect x="0" y="0" width={ARTBOARD_W} height={ARTBOARD_H} fill="url(#dotsR)" />

      <WireText x={28} y={36} size={22} fill={ink()} font="Caveat" weight={700}>responsive · same html · 3 breakpoints</WireText>
      <WireMono x={420} y={34} size={10} fill={inkDim()}>≥900 desktop · 600-900 tablet · &lt;600 mobile</WireMono>

      {/* ── DESKTOP (compressed wall) ── */}
      <g transform="translate(28, 70)">
        <WireMono x={0} y={-6} size={10} fill={inkDim()} weight={600}>desktop · ≥ 900px</WireMono>
        <WireBox x={0} y={0} w={520} h={300} seed={2000} stroke={inkFaint()} sw={1.2} fill={bgAlt()} />
        {/* top bar */}
        <WireLine x1={0} y1={22} x2={520} y2={22} sw={1} stroke={inkFaint()} seed={2001} />
        <WireMono x={10} y={15} size={9} fill={ink()}>tmux · agents</WireMono>
        <WireMono x={510} y={15} anchor="end" size={8} fill={inkFaint()}>main · 8 agents</WireMono>
        {/* sessions row */}
        {[0,1,2].map(i => (
          <g key={i}>
            <WireBox x={10 + i * 56} y={32} w={50} h={16} seed={2010 + i} stroke={i === 0 ? palette.accent : inkFaint()} sw={i === 0 ? 1.4 : 1} />
            <WireMono x={35 + i * 56} y={43} anchor="middle" size={8} fill={i === 0 ? ink() : inkDim()}>main</WireMono>
          </g>
        ))}
        {/* 4×2 wall */}
        <g transform="translate(10, 56)">
          {Array.from({ length: 8 }).map((_, i) => {
            const col = i % 4, row = Math.floor(i / 4);
            return (
              <g key={i} transform={`translate(${col * 126}, ${row * 110})`}>
                <WireBox x={0} y={0} w={120} h={104} seed={2020 + i} stroke={i === 0 ? palette.accent : inkFaint()} sw={i === 0 ? 1.4 : 1} fill={bg()} />
                <WireDot cx={8} cy={10} r={2.5} color={palette.accent} pulse={i === 0} />
                <WireMono x={16} y={13} size={8} fill={ink()}>agent-{i}</WireMono>
                {[0,1,2].map(k => (
                  <WireScribble key={k} x={6} y={28 + k * 10} w={108 - (k === 2 ? 30 : 0)} seed={2030 + i * 10 + k} stroke={inkFaint()} opacity={0.5} />
                ))}
                <WireBar x={6} y={86} w={50} h={6} value={0.5 + i * 0.05} color={palette.accent} seed={2040 + i} />
              </g>
            );
          })}
        </g>
        {/* bottom bar */}
        <WireBox x={10} y={278} w={500} h={14} seed={2050} stroke={inkFaint()} sw={1} />
        <WireMono x={16} y={288} size={7} fill={inkFaint()}>?</WireMono>
        <WireMono x={26} y={288} size={7} fill={inkFaint()}>type or hold ⌥space to talk...</WireMono>
        <WireMono x={500} y={288} anchor="end" size={7} fill={palette.accent}>send ⏎</WireMono>
      </g>

      {/* ── TABLET ── */}
      <g transform="translate(572, 70)">
        <WireMono x={0} y={-6} size={10} fill={inkDim()} weight={600}>tablet · 600 – 900px</WireMono>
        <WireBox x={0} y={0} w={236} h={300} seed={2100} stroke={inkFaint()} sw={1.2} fill={bgAlt()} />
        <WireLine x1={0} y1={22} x2={236} y2={22} sw={1} stroke={inkFaint()} seed={2101} />
        <WireMono x={10} y={15} size={9} fill={ink()}>tmux · agents</WireMono>
        <WireMono x={226} y={15} anchor="end" size={8} fill={inkFaint()}>≡</WireMono>
        {/* sessions as horizontal scroll */}
        <g transform="translate(10, 30)">
          {[0,1,2].map(i => (
            <g key={i}>
              <WireBox x={i * 50} y={0} w={44} h={16} seed={2110 + i} stroke={i === 0 ? palette.accent : inkFaint()} sw={i === 0 ? 1.4 : 1} />
              <WireMono x={i * 50 + 22} y={11} anchor="middle" size={8} fill={i === 0 ? ink() : inkDim()}>s-{i}</WireMono>
            </g>
          ))}
        </g>
        {/* 2×N wall */}
        <g transform="translate(10, 56)">
          {Array.from({ length: 6 }).map((_, i) => {
            const col = i % 2, row = Math.floor(i / 2);
            return (
              <g key={i} transform={`translate(${col * 110}, ${row * 70})`}>
                <WireBox x={0} y={0} w={104} h={64} seed={2120 + i} stroke={i === 0 ? palette.accent : inkFaint()} sw={i === 0 ? 1.4 : 1} fill={bg()} />
                <WireDot cx={8} cy={10} r={2.5} color={palette.accent} pulse={i === 0} />
                <WireMono x={16} y={13} size={8} fill={ink()}>agent-{i}</WireMono>
                {[0,1].map(k => (
                  <WireScribble key={k} x={6} y={26 + k * 10} w={92 - (k === 1 ? 20 : 0)} seed={2130 + i * 10 + k} stroke={inkFaint()} opacity={0.5} />
                ))}
                <WireBar x={6} y={50} w={40} h={6} value={0.4 + i * 0.08} color={palette.accent} seed={2140 + i} />
              </g>
            );
          })}
        </g>
        {/* bottom bar */}
        <WireBox x={10} y={278} w={216} h={14} seed={2150} stroke={inkFaint()} sw={1} />
        <WireMono x={16} y={288} size={7} fill={inkFaint()}>?</WireMono>
        <WireMono x={26} y={288} size={7} fill={inkFaint()}>type or hold to talk...</WireMono>
        <WireMono x={216} y={288} anchor="end" size={7} fill={palette.accent}>⏎</WireMono>
      </g>

      {/* ── MOBILE — wall view ── */}
      <g transform="translate(836, 70)">
        <WireMono x={0} y={-6} size={10} fill={inkDim()} weight={600}>mobile · &lt; 600px (wall)</WireMono>
        <WireBox x={0} y={0} w={188} h={300} seed={2200} stroke={inkFaint()} sw={1.4} fill={bgAlt()} />
        {/* status bar */}
        <WireMono x={10} y={12} size={7} fill={inkFaint()}>9:41</WireMono>
        <WireMono x={178} y={12} anchor="end" size={7} fill={inkFaint()}>● ●</WireMono>
        {/* top bar with hamburger */}
        <WireLine x1={0} y1={20} x2={188} y2={20} sw={1} stroke={inkFaint()} seed={2201} />
        <WireMono x={10} y={32} size={8} fill={ink()}>≡</WireMono>
        <WireMono x={94} y={32} anchor="middle" size={9} fill={ink()} weight={600}>main · 8</WireMono>
        <WireMono x={178} y={32} anchor="end" size={8} fill={ink()}>+</WireMono>
        <WireLine x1={0} y1={40} x2={188} y2={40} sw={1} stroke={inkFaint()} seed={2202} />
        {/* sessions horizontal scroll snap */}
        <g transform="translate(8, 46)">
          {[0,1,2].map(i => (
            <g key={i}>
              <WireBox x={i * 56} y={0} w={50} h={16} seed={2210 + i} stroke={i === 0 ? palette.accent : inkFaint()} sw={i === 0 ? 1.4 : 1} />
              <WireMono x={i * 56 + 25} y={11} anchor="middle" size={7} fill={i === 0 ? ink() : inkDim()}>s-{i}</WireMono>
            </g>
          ))}
        </g>
        {/* 1-col wall */}
        <g transform="translate(8, 70)">
          {Array.from({ length: 3 }).map((_, i) => (
            <g key={i} transform={`translate(0, ${i * 56})`}>
              <WireBox x={0} y={0} w={172} h={50} seed={2220 + i} stroke={i === 0 ? palette.accent : inkFaint()} sw={i === 0 ? 1.4 : 1} fill={bg()} />
              <WireDot cx={8} cy={10} r={2.5} color={palette.accent} pulse={i === 0} />
              <WireMono x={16} y={13} size={8} fill={ink()}>agent-{i}</WireMono>
              <WireMono x={166} y={13} anchor="end" size={7} fill={inkFaint()}>12m</WireMono>
              <WireScribble x={8} y={26} w={150} seed={2230 + i} stroke={inkFaint()} opacity={0.5} />
              <WireScribble x={8} y={36} w={120} seed={2240 + i} stroke={inkFaint()} opacity={0.4} />
              <WireBar x={8} y={42} w={60} h={4} value={0.5 + i * 0.1} color={palette.accent} seed={2250 + i} />
            </g>
          ))}
        </g>
        {/* bottom bar — bigger touch target */}
        <WireBox x={6} y={250} w={176} h={22} seed={2260} stroke={inkFaint()} sw={1.2} fill={bg()} />
        <WireMono x={14} y={264} size={8} fill={inkFaint()}>type a message...</WireMono>
        <circle cx={156} cy={261} r={9} fill={palette.accent3} opacity={0.18} />
        <circle cx={156} cy={261} r={9} fill="none" stroke={palette.accent3} strokeWidth={1.4} />
        <rect x={154} y={257} width={4} height={5} rx={2} fill={palette.accent3} />
        {/* home indicator */}
        <rect x={64} y={284} width={60} height={3} rx={1.5} fill={inkFaint()} />
      </g>

      {/* ── MOBILE — attached terminal view ── */}
      <g transform="translate(572, 400)">
        <WireMono x={0} y={-6} size={10} fill={inkDim()} weight={600}>mobile · attached</WireMono>
        <WireBox x={0} y={0} w={188} h={280} seed={2300} stroke={inkFaint()} sw={1.4} fill={bg()} />
        <WireMono x={10} y={12} size={7} fill={inkFaint()}>9:41</WireMono>
        <WireMono x={178} y={12} anchor="end" size={7} fill={inkFaint()}>● ●</WireMono>
        {/* compact header: back + name + … */}
        <WireLine x1={0} y1={20} x2={188} y2={20} sw={1} stroke={inkFaint()} seed={2301} />
        <path d={`M 14 31 L 9 35 L 14 39`} stroke={ink()} strokeWidth={1.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <WireDot cx={26} cy={35} r={2.5} color={palette.accent} pulse />
        <WireMono x={94} y={38} anchor="middle" size={9} fill={ink()} weight={600}>refactor-bot</WireMono>
        <WireMono x={178} y={38} anchor="end" size={10} fill={ink()}>···</WireMono>
        <WireLine x1={0} y1={46} x2={188} y2={46} sw={1} stroke={inkFaint()} seed={2302} />
        {/* metrics bar (collapsed status) */}
        <WireMono x={10} y={58} size={7} fill={inkDim()}>cpu 72%</WireMono>
        <WireMono x={56} y={58} size={7} fill={inkDim()}>mem 41%</WireMono>
        <WireMono x={102} y={58} size={7} fill={inkDim()}>12m 03s</WireMono>
        <WireMono x={178} y={58} anchor="end" size={7} fill={palette.accent}>● run</WireMono>
        <WireLine x1={0} y1={64} x2={188} y2={64} sw={1} stroke={inkFaint()} seed={2303} />
        {/* tiny terminal */}
        <g transform="translate(8, 70)">
          {[
            { p: '>', t: 'parsing src/auth/mod.rs', color: palette.accent },
            { p: '>', t: 'detected 4 splits' },
            { p: '>', t: 'writing middleware.rs' },
            { p: '>', t: 'writing jwt.rs' },
            { p: '>', t: 'tests 14/14 ✓', color: palette.accent },
            { p: '',  t: '' },
            { p: '?', t: 'Apply edit?', color: palette.accent2 },
            { p: '',  t: '❯ 1. Yes' },
            { p: '',  t: '  2. Yes always', dim: true },
            { p: '',  t: '  3. No', dim: true },
          ].map((l, i) => (
            <WireTermLine key={i} x={0} y={10 + i * 11} prompt={l.p} text={l.t} dim={l.dim} color={l.color} />
          ))}
        </g>
        {/* contextual key-strip — phone version: horizontal scroll bar of pill chips */}
        <g transform="translate(0, 200)">
          <WireBox x={6} y={0} w={176} h={26} seed={2310} stroke={palette.accent2} sw={1.3} fill={'rgba(232,184,109,0.06)'} dashed />
          {[
            { k: 'Yes', color: palette.accent },
            { k: 'No', color: palette.accent3 },
            { k: 'Always', color: palette.accent },
            { k: '⎋', color: inkDim() },
          ].map((s, i) => (
            <g key={i} transform={`translate(${12 + i * 42}, 4)`}>
              <WireBox x={0} y={0} w={36} h={18} seed={2320 + i} stroke={s.color} sw={1.3} fill={'rgba(255,255,255,0.02)'} />
              <WireMono x={18} y={12} anchor="middle" size={8} fill={s.color} weight={700}>{s.k}</WireMono>
            </g>
          ))}
        </g>
        {/* bottom input bar — same pattern, bigger mic */}
        <WireBox x={6} y={232} w={120} h={22} seed={2330} stroke={inkFaint()} sw={1.2} fill={bgAlt()} />
        <WireMono x={14} y={246} size={8} fill={inkFaint()}>type or hold mic...</WireMono>
        <circle cx={140} cy={243} r={11} fill={palette.accent3} opacity={0.2} />
        <circle cx={140} cy={243} r={11} fill="none" stroke={palette.accent3} strokeWidth={1.5} />
        <rect x={137} y={238} width={6} height={7} rx={3} fill={palette.accent3} />
        <WireBox x={156} y={232} w={26} h={22} seed={2340} stroke={palette.accent} sw={1.4} fill={'rgba(155,210,139,0.10)'} />
        <WireMono x={169} y={246} anchor="middle" size={9} fill={palette.accent} weight={700}>⏎</WireMono>
        {/* home indicator */}
        <rect x={64} y={264} width={60} height={3} rx={1.5} fill={inkFaint()} />
      </g>



      <Annot x={930} y={148} dx={-30} dy={-30} label="phone · same DNA" seed={2400} anchor="end" />
      <Annot x={680} y={460} dx={-30} dy={-30} label="contextual keys → pill chips" seed={2401} anchor="end" />
    </ArtboardFrame>
  );
}

Object.assign(window, { VariantResponsive });
