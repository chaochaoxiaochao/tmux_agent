// wire-primitives.jsx — sketchy/手绘 wireframe primitives
// Shared deps: React. Exports to window: WireBox, WireLine, WireText, WireBtn,
// WireTab, WireDot, WireBar, WirePill, WireScribble, WireTermLine, WireIcon, palette.

const palette = {
  bg: '#1f2024',         // dark canvas
  bgAlt: '#2a2b30',
  ink: '#e8e6df',        // hand-drawn ink (warm white)
  inkDim: '#9c9a93',
  inkFaint: '#56554f',
  accent: '#9bd28b',     // soft running-green
  accent2: '#e8b86d',    // warning amber (used sparingly)
  accent3: '#d97a7a',    // error red (sparingly)
  paper: '#f0eee9',      // light artboard bg (canvas itself)
};

// pseudo-random but deterministic jitter for sketch lines
function jitter(seed, range = 1) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return ((x - Math.floor(x)) - 0.5) * 2 * range;
}

// Sketchy box: a rect drawn with two slightly offset SVG paths
function WireBox({ x = 0, y = 0, w = 100, h = 40, stroke = palette.ink, fill = 'none', sw = 1.5, seed = 1, dashed = false, style = {}, children, onClick }) {
  // build a wobbly rect path
  const j = (s) => jitter(seed + s, 1.2);
  const pts = [
    [x + j(1), y + j(2)],
    [x + w + j(3), y + j(4)],
    [x + w + j(5), y + h + j(6)],
    [x + j(7), y + h + j(8)],
  ];
  const d1 = `M ${pts[0][0]} ${pts[0][1]} L ${pts[1][0]} ${pts[1][1]} L ${pts[2][0]} ${pts[2][1]} L ${pts[3][0]} ${pts[3][1]} Z`;
  // second pass with slightly different jitter
  const j2 = (s) => jitter(seed + s + 100, 1.0);
  const pts2 = [
    [x + j2(1), y + j2(2)],
    [x + w + j2(3), y + j2(4)],
    [x + w + j2(5), y + h + j2(6)],
    [x + j2(7), y + h + j2(8)],
  ];
  const d2 = `M ${pts2[0][0]} ${pts2[0][1]} L ${pts2[1][0]} ${pts2[1][1]} L ${pts2[2][0]} ${pts2[2][1]} L ${pts2[3][0]} ${pts2[3][1]} Z`;
  return (
    <g onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', ...style }}>
      {fill !== 'none' && <path d={d1} fill={fill} stroke="none" />}
      <path d={d1} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dashed ? '4 3' : undefined} opacity={0.85} />
      <path d={d2} fill="none" stroke={stroke} strokeWidth={sw * 0.7} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dashed ? '4 3' : undefined} opacity={0.55} />
      {children}
    </g>
  );
}

// Sketchy line
function WireLine({ x1, y1, x2, y2, stroke = palette.ink, sw = 1.4, seed = 1, dashed = false }) {
  const j = (s) => jitter(seed + s, 0.8);
  // curve slightly via midpoint offset
  const mx = (x1 + x2) / 2 + j(1) * 1.5;
  const my = (y1 + y2) / 2 + j(2) * 1.5;
  const d = `M ${x1 + j(3)} ${y1 + j(4)} Q ${mx} ${my} ${x2 + j(5)} ${y2 + j(6)}`;
  return <path d={d} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeDasharray={dashed ? '4 3' : undefined} opacity={0.85} />;
}

// Hand-written text (uses Kalam / Caveat)
function WireText({ x, y, children, size = 12, fill = palette.ink, font = 'Kalam', weight = 400, anchor = 'start', opacity = 1, italic = false }) {
  return (
    <text x={x} y={y} fontFamily={`${font}, system-ui, sans-serif`} fontSize={size} fontWeight={weight} fontStyle={italic ? 'italic' : 'normal'} fill={fill} textAnchor={anchor} opacity={opacity} style={{ userSelect: 'none' }}>
      {children}
    </text>
  );
}

// Mono text — for terminal output and code-y bits
function WireMono({ x, y, children, size = 10, fill = palette.ink, weight = 400, anchor = 'start', opacity = 1 }) {
  return (
    <text x={x} y={y} fontFamily="'JetBrains Mono', monospace" fontSize={size} fontWeight={weight} fill={fill} textAnchor={anchor} opacity={opacity} style={{ userSelect: 'none' }}>
      {children}
    </text>
  );
}

// Sketchy button: box + label
function WireBtn({ x, y, w = 70, h = 22, label, seed = 1, active = false, mono = false, fill = 'none', stroke = palette.ink }) {
  return (
    <g>
      <WireBox x={x} y={y} w={w} h={h} seed={seed} fill={active ? palette.accent : fill} stroke={active ? palette.accent : stroke} sw={active ? 1.8 : 1.3} />
      {mono ? (
        <WireMono x={x + w / 2} y={y + h / 2 + 3.5} anchor="middle" size={9} fill={active ? palette.bg : palette.ink}>{label}</WireMono>
      ) : (
        <WireText x={x + w / 2} y={y + h / 2 + 4} anchor="middle" size={12} fill={active ? palette.bg : palette.ink} weight={500}>{label}</WireText>
      )}
    </g>
  );
}

// Tab — looks like a folder-tab on top edge
function WireTab({ x, y, w = 90, h = 24, label, status = 'idle', active = false, seed = 1 }) {
  const dotColor = status === 'running' ? palette.accent : status === 'warn' ? palette.accent2 : status === 'err' ? palette.accent3 : palette.inkFaint;
  // shape: trapezoid-ish wobbly path
  const j = (s) => jitter(seed + s, 0.8);
  const d = `
    M ${x + j(1)} ${y + h + j(2)}
    L ${x + 4 + j(3)} ${y + 2 + j(4)}
    Q ${x + 6} ${y - 1} ${x + 10 + j(5)} ${y + j(6)}
    L ${x + w - 10 + j(7)} ${y + j(8)}
    Q ${x + w - 6} ${y - 1} ${x + w - 4 + j(9)} ${y + 2 + j(10)}
    L ${x + w + j(11)} ${y + h + j(12)}
  `;
  return (
    <g>
      {active && <path d={d + ` Z`} fill={palette.bgAlt} />}
      <path d={d} fill="none" stroke={active ? palette.ink : palette.inkDim} strokeWidth={active ? 1.6 : 1.1} strokeLinecap="round" strokeLinejoin="round" opacity={active ? 0.95 : 0.6} />
      <circle cx={x + 12} cy={y + h / 2 + 1} r={2.6} fill={dotColor} opacity={0.9} />
      <WireMono x={x + 20} y={y + h / 2 + 4} size={10} fill={active ? palette.ink : palette.inkDim}>{label}</WireMono>
    </g>
  );
}

// Status dot
function WireDot({ cx, cy, r = 3, color = palette.accent, pulse = false }) {
  return (
    <g>
      {pulse && <circle cx={cx} cy={cy} r={r + 3} fill={color} opacity={0.18}>
        <animate attributeName="r" values={`${r + 1};${r + 5};${r + 1}`} dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
      </circle>}
      <circle cx={cx} cy={cy} r={r} fill={color} />
    </g>
  );
}

// Bar (for cpu/mem sparkline-style)
function WireBar({ x, y, w, h, value = 0.5, color = palette.accent, seed = 1 }) {
  const j = jitter(seed, 0.6);
  return (
    <g>
      <WireBox x={x} y={y} w={w} h={h} seed={seed} stroke={palette.inkFaint} sw={1} />
      <rect x={x + 2} y={y + 2 + j} width={Math.max(0, (w - 4) * value)} height={h - 4} fill={color} opacity={0.55} rx={1} />
    </g>
  );
}

// Pill
function WirePill({ x, y, label, color = palette.inkDim, seed = 1, mono = true }) {
  const w = (label.length * (mono ? 6.2 : 7)) + 14;
  const h = 16;
  return (
    <g>
      <WireBox x={x} y={y} w={w} h={h} seed={seed} stroke={color} sw={1.1} />
      {mono
        ? <WireMono x={x + w / 2} y={y + h / 2 + 3.5} anchor="middle" size={9} fill={color}>{label}</WireMono>
        : <WireText x={x + w / 2} y={y + h / 2 + 4} anchor="middle" size={11} fill={color}>{label}</WireText>}
    </g>
  );
}

// Squiggle / scribble — placeholder text line
function WireScribble({ x, y, w = 80, seed = 1, opacity = 0.5, stroke = palette.inkDim }) {
  const segs = 6;
  let d = `M ${x} ${y}`;
  for (let i = 1; i <= segs; i++) {
    const sx = x + (w / segs) * i;
    const sy = y + jitter(seed + i, 1.4);
    const cx = x + (w / segs) * (i - 0.5);
    const cy = y + jitter(seed + i + 50, 2.2);
    d += ` Q ${cx} ${cy} ${sx} ${sy}`;
  }
  return <path d={d} fill="none" stroke={stroke} strokeWidth={1.2} strokeLinecap="round" opacity={opacity} />;
}

// Terminal output line (mono with optional prompt prefix)
function WireTermLine({ x, y, prompt, text, dim = false, color }) {
  return (
    <g>
      {prompt && <WireMono x={x} y={y} size={10} fill={palette.accent} weight={500}>{prompt}</WireMono>}
      <WireMono x={x + (prompt ? prompt.length * 6.2 + 6 : 0)} y={y} size={10} fill={color || (dim ? palette.inkFaint : palette.ink)} opacity={dim ? 0.7 : 1}>{text}</WireMono>
    </g>
  );
}

// Tiny icon-ish glyphs drawn via path. kind: 'plus' | 'x' | 'split-h' | 'split-v' | 'search' | 'menu' | 'play' | 'pause' | 'reload'
function WireIcon({ x, y, size = 14, kind = 'plus', stroke = palette.inkDim, sw = 1.4 }) {
  const s = size;
  const cx = x + s / 2, cy = y + s / 2;
  let d = '';
  switch (kind) {
    case 'plus': d = `M ${cx} ${y + 2} L ${cx} ${y + s - 2} M ${x + 2} ${cy} L ${x + s - 2} ${cy}`; break;
    case 'x': d = `M ${x + 2} ${y + 2} L ${x + s - 2} ${y + s - 2} M ${x + s - 2} ${y + 2} L ${x + 2} ${y + s - 2}`; break;
    case 'split-h': d = `M ${x + 2} ${cy} L ${x + s - 2} ${cy} M ${x + 2} ${y + 2} L ${x + 2} ${y + s - 2} M ${x + s - 2} ${y + 2} L ${x + s - 2} ${y + s - 2}`; break;
    case 'split-v': d = `M ${cx} ${y + 2} L ${cx} ${y + s - 2} M ${x + 2} ${y + 2} L ${x + s - 2} ${y + 2} M ${x + 2} ${y + s - 2} L ${x + s - 2} ${y + s - 2}`; break;
    case 'search': return (
      <g>
        <circle cx={x + s / 2 - 1} cy={y + s / 2 - 1} r={s / 2.8} fill="none" stroke={stroke} strokeWidth={sw} />
        <line x1={x + s - 4} y1={y + s - 4} x2={x + s - 1} y2={y + s - 1} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </g>
    );
    case 'menu': d = `M ${x + 2} ${y + 3} L ${x + s - 2} ${y + 3} M ${x + 2} ${cy} L ${x + s - 2} ${cy} M ${x + 2} ${y + s - 3} L ${x + s - 2} ${y + s - 3}`; break;
    case 'play': d = `M ${x + 3} ${y + 2} L ${x + s - 2} ${cy} L ${x + 3} ${y + s - 2} Z`; break;
    case 'pause': d = `M ${x + 3} ${y + 2} L ${x + 3} ${y + s - 2} M ${x + s - 3} ${y + 2} L ${x + s - 3} ${y + s - 2}`; break;
    case 'reload': return (
      <g>
        <path d={`M ${x + s - 3} ${y + 3} A ${s / 2.5} ${s / 2.5} 0 1 0 ${x + s - 3} ${y + s - 3}`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <path d={`M ${x + s - 5} ${y + 1} L ${x + s - 3} ${y + 3} L ${x + s - 5} ${y + 5}`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
    default: d = '';
  }
  return <path d={d} fill={kind === 'play' ? stroke : 'none'} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />;
}

Object.assign(window, {
  palette, jitter,
  WireBox, WireLine, WireText, WireMono, WireBtn, WireTab, WireDot, WireBar, WirePill, WireScribble, WireTermLine, WireIcon,
});
