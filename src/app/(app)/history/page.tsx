import Link from "next/link";
import { scoped } from "@/lib/data";
import { kgTo } from "@/lib/metrics";

export default async function HistoryPage() {
  const r = await scoped();
  const [unit, list] = await Promise.all([r.getUnit(), r.history()]);
  return (
    <>
      <h1>History</h1>
      {list.length === 0 && <p className="mute">No workouts yet. Start one from the Log tab.</p>}
      {list.map((w) => (
        <Link key={w.id} href={`/history/${w.id}`} style={{ textDecoration: "none" }}>
          <div className="card">
            <h2>{w.name}</h2>
            <span className="mute">{w.date} · {w.sets} sets{Number(w.volumeKg) > 0 ? ` · ${Math.round(kgTo(Number(w.volumeKg), unit)).toLocaleString()} ${unit} total volume` : ""}</span>
          </div>
        </Link>
      ))}
    </>
  );
}
