import Link from "next/link";
import { scoped } from "@/lib/data";
import { display, score } from "@/lib/metrics";
import { Chart } from "./chart";
import { Streak } from "./streak";
import "./progress.css";

export default async function ProgressPage({ searchParams }: { searchParams: Promise<{ ex?: string }> }) {
  const { ex } = await searchParams;
  const r = await scoped();
  const [unit, days, bests] = await Promise.all([r.getUnit(), r.trainingDays(), r.bests()]);
  const current = bests.find((b) => b.exerciseId === ex) ?? bests[0];

  const rows = current ? await r.series(current.exerciseId) : [];
  const byDate = new Map<string, (typeof rows)[number]>();
  for (const s of rows) {
    const p = byDate.get(s.date);
    if (!p || current && score(current.kind, s) > score(current.kind, p)) byDate.set(s.date, s);
  }
  const points = current ? [...byDate].map(([date, s]) => ({ date, value: display(current.kind, s, unit).value })) : [];
  const label = current ? display(current.kind, current, unit).label : "";

  return (
    <>
      <h1>Progress</h1>
      <div className="card"><h2>Consistency</h2><Streak days={days} /></div>

      {bests.length === 0 ? (
        <p className="mute">Log a few sets and your charts and records show up here.</p>
      ) : (
        <>
          <div className="card">
            <h2>{current.name}</h2>
            <Chart points={points} label={label} />
            <div className="pills">
              {bests.map((b) => (
                <Link key={b.exerciseId} href={`/progress?ex=${b.exerciseId}`} className={`pill${b.exerciseId === current.exerciseId ? " on" : ""}`}>
                  {b.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="card">
            <h2>Personal records</h2>
            {bests.map((b) => {
              const d = display(b.kind, b, unit);
              return (
                <div className="set" key={b.exerciseId}>
                  <span>{b.name}</span>
                  <span><span className="big">{d.value} {d.label}</span> <span className="mute">{b.date}</span></span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
