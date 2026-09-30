type P = { date: string; value: number };
const r1 = (n: number) => Math.round(n * 10) / 10;

export function Chart({ points, label }: { points: P[]; label: string }) {
  if (points.length === 0) return <p className="mute">Nothing logged for this exercise yet.</p>;
  const W = 600, H = 220, L = 44, R = 14, T = 14, B = 28;
  const vals = points.map((p) => p.value);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.1;
  min = Math.max(0, min - pad); max += pad;
  const x = (i: number) => (points.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (points.length - 1));
  const y = (v: number) => T + (1 - (v - min) / (max - min)) * (H - T - B);
  const ticks = [min, (min + max) / 2, max];
  const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const first = points[0], lastP = points[points.length - 1];

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`${label} over time: from ${r1(first.value)} on ${first.date} to ${r1(lastP.value)} on ${lastP.date}`}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--line)" />
          <text x={L - 6} y={y(t) + 4} textAnchor="end">{r1(t)}</text>
        </g>
      ))}
      {points.length > 1 && <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" />}
      {points.map((p, i) => <circle key={p.date} cx={x(i)} cy={y(p.value)} r="4" fill="var(--accent)"><title>{`${p.date}: ${r1(p.value)} ${label}`}</title></circle>)}
      <text x={L} y={H - 8}>{first.date}</text>
      {points.length > 1 && <text x={W - R} y={H - 8} textAnchor="end">{lastP.date}</text>}
    </svg>
  );
}
