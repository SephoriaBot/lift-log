import Link from "next/link";
import { scoped } from "@/lib/data";
import { kgTo } from "@/lib/metrics";

export default async function HistoryPage() {
  const r = await scoped();
  const [unit, list] = await Promise.all([
    r.getUnit(),
    r.history(),
  ]);

  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  const weekWorkouts = list.filter((w) => {
    const date = new Date(`${w.date}T00:00:00`);
    return date >= weekStart;
  });

  const weekSets = weekWorkouts.reduce(
    (sum, w) => sum + Number(w.sets),
    0,
  );

  const weekVolumeKg = weekWorkouts.reduce(
    (sum, w) => sum + Number(w.volumeKg),
    0,
  );

  const weekVolume =
    Math.round(kgTo(weekVolumeKg, unit)).toLocaleString();

  return (
    <>
      <h1>History</h1>

      <div className="card">
        <h2>This week</h2>

        <div
          className="row"
          style={{
            flexWrap: "wrap",
            marginBottom: "0.5rem",
          }}
        >
          <div>
            <div className="mute">Workouts</div>
            <strong className="big">
              {weekWorkouts.length}
            </strong>
          </div>

          <div>
            <div className="mute">Sets</div>
            <strong className="big">
              {weekSets}
            </strong>
          </div>

          <div>
            <div className="mute">Volume</div>
            <strong className="big">
              {weekVolume} {unit}
            </strong>
          </div>
        </div>

        <p className="mute" style={{ margin: 0 }}>
          Monday–today
        </p>
      </div>

      {list.length === 0 && (
        <p className="mute">
          No workouts yet. Start one from the Log tab.
        </p>
      )}

      {list.map((w) => (
        <Link
          key={w.id}
          href={`/history/${w.id}`}
          style={{ textDecoration: "none" }}
        >
          <div className="card">
            <h2>{w.name}</h2>

            <span className="mute">
              {w.date} · {w.sets} sets
              {Number(w.volumeKg) > 0
                ? ` · ${Math.round(
                    kgTo(Number(w.volumeKg), unit),
                  ).toLocaleString()} ${unit} total volume`
                : ""}
            </span>
          </div>
        </Link>
      ))}
    </>
  );
}