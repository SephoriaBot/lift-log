import { fromKg, scoped } from "@/lib/data";

export default async function HistoryPage() {
  const r = await scoped();
  const [unit, list] = await Promise.all([r.getUnit(), r.history()]);
  return (
    <>
      <h1>History</h1>
      {list.length === 0 && <p className="mute">No workouts yet. Start one from the Log tab.</p>}
      {list.map((w) => (
        <div className="card" key={w.id}>
          <h2>{w.name}</h2>
          <span className="mute">{w.date} · {w.sets} sets · {Math.round(fromKg(Number(w.volumeKg), unit)).toLocaleString()} {unit} total volume</span>
        </div>
      ))}
    </>
  );
}
