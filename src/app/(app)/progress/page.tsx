import Link from "next/link";
import { scoped } from "@/lib/data";
import { display, score, volume } from "@/lib/metrics";
import { Chart } from "./chart";
import { Streak } from "./streak";
import "./progress.css";

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ ex?: string }>;
}) {
  const { ex } = await searchParams;
  const r = await scoped();

  const [unit, days, bests] = await Promise.all([
    r.getUnit(),
    r.trainingDays(),
    r.bests(),
  ]);

  const current = bests.find((b) => b.exerciseId === ex) ?? bests[0];

  const rows = current ? await r.series(current.exerciseId) : [];

  const byDate = new Map<string, (typeof rows)[number]>();

  for (const s of rows) {
    const p = byDate.get(s.date);

    if (
      !p ||
      (current && score(current.kind, s) > score(current.kind, p))
    ) {
      byDate.set(s.date, s);
    }
  }

  const history = [...byDate].map(([date, s]) => ({
    date,
    set: s,
    display: display(current!.kind, s, unit),
  }));

  const points = history.map((p) => ({
    date: p.date,
    value: p.display.value,
  }));

  const label = current
    ? display(current.kind, current, unit).label
    : "";

  const first = history[0];
  const latest = history[history.length - 1];
  const best = current ? display(current.kind, current, unit) : null;

  const firstScore = first ? score(current!.kind, first.set) : 0;
  const latestScore = latest ? score(current!.kind, latest.set) : 0;

  const change =
    first && latest
      ? latestScore - firstScore
      : 0;

  const totalVolume = current
    ? rows.reduce(
        (sum, set) => sum + volume(current.kind, set),
        0,
      )
    : 0;

  const recentVolume = current
    ? rows
        .filter((set) => {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - 30);
          return new Date(set.date) >= cutoff;
        })
        .reduce(
          (sum, set) => sum + volume(current.kind, set),
          0,
        )
    : 0;

  const volumeLabel =
    current?.kind === "strength"
      ? `${unit} lifted`
      : current?.kind === "bodyweight"
        ? "weighted reps"
        : current
          ? "training minutes / distance"
          : "";

  return (
    <>
      <h1>Progress</h1>

      <div className="card">
        <h2>Consistency</h2>
        <Streak days={days} />
      </div>

      {bests.length === 0 ? (
        <p className="mute">
          Log a few sets and your charts and records show up here.
        </p>
      ) : (
        <>
          <div className="card">
            <h2>{current.name}</h2>

            {best && (
              <div
                className="row"
                style={{
                  marginBottom: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div className="mute">Current best</div>
                  <strong className="big">
                    {best.value} {best.label}
                  </strong>
                </div>

                {first && (
                  <div>
                    <div className="mute">First logged</div>
                    <strong>
                      {first.display.value} {first.display.label}
                    </strong>
                  </div>
                )}

                {latest && (
                  <div>
                    <div className="mute">Most recent</div>
                    <strong>
                      {latest.display.value} {latest.display.label}
                    </strong>
                  </div>
                )}

                {history.length > 1 && (
                  <div>
                    <div className="mute">Trend</div>
                    <strong>
                      {change > 0 ? "+" : ""}
                      {change.toFixed(1)}
                    </strong>
                  </div>
                )}
              </div>
            )}

            <Chart points={points} label={label} />

            <div className="pills">
              {bests.map((b) => (
                <Link
                  key={b.exerciseId}
                  href={`/progress?ex=${b.exerciseId}`}
                  className={`pill${
                    b.exerciseId === current.exerciseId
                      ? " on"
                      : ""
                  }`}
                >
                  {b.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>Training volume</h2>

            <div
              className="row"
              style={{
                flexWrap: "wrap",
                marginBottom: "0.5rem",
              }}
            >
              <div>
                <div className="mute">All time</div>
                <strong className="big">
                  {current.kind === "strength"
                    ? `${Math.round(totalVolume).toLocaleString()} ${unit}`
                    : current.kind === "bodyweight"
                      ? Math.round(totalVolume).toLocaleString()
                      : `${Math.round(totalVolume).toLocaleString()}`}
                </strong>
              </div>

              <div>
                <div className="mute">Last 30 days</div>
                <strong className="big">
                  {current.kind === "strength"
                    ? `${Math.round(recentVolume).toLocaleString()} ${unit}`
                    : current.kind === "bodyweight"
                      ? Math.round(recentVolume).toLocaleString()
                      : `${Math.round(recentVolume).toLocaleString()}`}
                </strong>
              </div>
            </div>

            <p className="mute" style={{ margin: 0 }}>
              {volumeLabel}
            </p>
          </div>

          <div className="card">
            <h2>Personal records</h2>

            {bests.map((b) => {
              const d = display(b.kind, b, unit);

              return (
                <div className="set" key={b.exerciseId}>
                  <span>{b.name}</span>

                  <span>
                    <span className="big">
                      {d.value} {d.label}
                    </span>{" "}
                    <span className="mute">{b.date}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}