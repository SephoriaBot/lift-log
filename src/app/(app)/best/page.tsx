import { scoped } from "@/lib/data";
import { distFromM, distUnit, kgTo, score } from "@/lib/metrics";

export default async function BestPage() {
  const r = await scoped();
  const [unit, records] = await Promise.all([r.getUnit(), r.records()]);

  return (
    <>
      <h1>Best</h1>
      <p className="mute">
        Your top numbers for each exercise: heaviest weight, most reps in a
        single set, and estimated one-rep max.
      </p>

      {records.length === 0 ? (
        <p className="mute">Log a few sets and your bests show up here.</p>
      ) : (
        records.map((e) => (
          <div className="card" key={e.exerciseId}>
            <h2>{e.name}</h2>

            {e.kind === "cardio" ? (
              e.longest && (
                <div className="set">
                  <span>Longest</span>
                  <span>
                    <span className="big">
                      {e.longest.distanceM && e.longest.distanceM > 0
                        ? `${distFromM(e.longest.distanceM, unit)} ${distUnit(unit)}`
                        : `${Math.round((e.longest.durationSec ?? 0) / 60)} min`}
                    </span>{" "}
                    <span className="mute">{e.longest.date}</span>
                  </span>
                </div>
              )
            ) : (
              <>
                {e.heaviest && (
                  <div className="set">
                    <span>{e.kind === "bodyweight" ? "Most added weight" : "Heaviest weight"}</span>
                    <span>
                      <span className="big">
                        {kgTo(e.heaviest.weightKg, unit)} {unit} × {e.heaviest.reps}
                      </span>{" "}
                      <span className="mute">{e.heaviest.date}</span>
                    </span>
                  </div>
                )}

                {e.mostReps && (
                  <div className="set">
                    <span>Most reps (one set)</span>
                    <span>
                      <span className="big">
                        {e.mostReps.reps} reps
                        {e.mostReps.weightKg > 0
                          ? ` @ ${kgTo(e.mostReps.weightKg, unit)} ${unit}`
                          : ""}
                      </span>{" "}
                      <span className="mute">{e.mostReps.date}</span>
                    </span>
                  </div>
                )}

                {e.kind === "strength" && e.top && (
                  <div className="set">
                    <span>Est. 1RM</span>
                    <span className="big">
                      {kgTo(score("strength", e.top), unit)} {unit}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        ))
      )}
    </>
  );
}
