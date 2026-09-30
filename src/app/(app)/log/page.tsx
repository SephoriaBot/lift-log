import { deleteSet, finishWorkout } from "@/app/actions";
import { scoped } from "@/lib/data";
import { describeSet, distFromM, kgTo } from "@/lib/metrics";
import { SetForm } from "./set-form";
import { StartForm } from "./start-form";

export default async function LogPage() {
  const r = await scoped();
  const [unit, active] = await Promise.all([r.getUnit(), r.activeWorkout()]);
  if (!active) return (<><h1>Ready to train?</h1><StartForm /></>);

  const [exs, lastRaw, rows, prIds] = await Promise.all([
    r.listExercises(), r.lastSets(), r.workoutSets(active.id), r.prSetIds(active.id),
  ]);
  const prs = new Set(prIds);
  const last = Object.fromEntries(
    Object.entries(lastRaw).map(([id, v]) => [id, {
      reps: v.reps,
      weight: kgTo(v.weightKg, unit),
      minutes: Math.round(((v.durationSec ?? 0) / 60) * 10) / 10,
      distance: v.distanceM ? distFromM(v.distanceM, unit) : 0,
    }]),
  );
  const groups = new Map<string, typeof rows>();
  for (const s of rows) groups.set(s.exercise, [...(groups.get(s.exercise) ?? []), s]);

  return (
    <>
      <h1>{active.name}</h1>
      <p className="mute">{active.date}</p>
      <div className="card">
        <SetForm workoutId={active.id} exercises={exs.map((e) => ({ id: e.id, name: e.name, kind: e.kind }))} last={last} unit={unit} />
      </div>
      {[...groups].map(([name, list]) => (
        <div className="card" key={name}>
          <h2>{name}</h2>
          {list.map((s, i) => (
            <div className="set" key={s.id}>
              <span>
                <span className="big">{describeSet(s.kind, s, unit)}</span>
                {prs.has(s.id) && <strong style={{ color: "var(--accent)", marginLeft: ".5rem" }}>New PR</strong>}
              </span>
              <form action={deleteSet}><input type="hidden" name="id" value={s.id} />
                <button className="link" aria-label={`Delete set ${i + 1} of ${name}`}>Delete</button></form>
            </div>
          ))}
        </div>
      ))}
      <form action={finishWorkout}><input type="hidden" name="id" value={active.id} />
        <button className="ghost" style={{ width: "100%" }}>Finish workout</button></form>
    </>
  );
}
