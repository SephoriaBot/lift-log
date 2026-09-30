"use client";
import { useEffect, useState } from "react";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (d: Date, n: number) => { const c = new Date(d); c.setDate(c.getDate() + n); return c; };

export function Streak({ days }: { days: string[] }) {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(iso(new Date())), []); // "today" must come from the user's device, not the server
  if (!today) return <div style={{ minHeight: 140 }} />;

  const set = new Set(days);
  let cur = parse(today);
  if (!set.has(iso(cur))) cur = addDays(cur, -1);
  let streak = 0;
  while (set.has(iso(cur))) { streak++; cur = addDays(cur, -1); }

  const sorted = [...set].sort();
  let longest = 0, run = 0, prev: Date | null = null;
  for (const s of sorted) {
    const d = parse(s);
    run = prev && iso(addDays(prev, 1)) === s ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }

  const t = parse(today);
  const start = addDays(t, -t.getDay() - 7 * 11); // 12 weeks, columns start on Sunday
  const cells = Array.from({ length: 84 }, (_, i) => addDays(start, i));
  const inLast30 = days.filter((d) => d >= iso(addDays(t, -29))).length;

  return (
    <>
      <div className="stats">
        <div><div className="big">{streak}</div><div className="mute">day streak</div></div>
        <div><div className="big">{longest}</div><div className="mute">longest</div></div>
        <div><div className="big">{inLast30}</div><div className="mute">days in 30</div></div>
      </div>
      <div className="cal" role="img" aria-label={`Training days over the last 12 weeks: ${inLast30} in the last 30 days`}>
        {cells.map((d) => {
          const k = iso(d);
          return <i key={k} title={k} className={k > today ? "future" : set.has(k) ? "hit" : ""} />;
        })}
      </div>
    </>
  );
}
