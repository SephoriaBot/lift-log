import { deleteSet, finishWorkout } from "@/app/actions";
import { fromKg, scoped } from "@/lib/data";
import { SetForm } from "./set-form";
import { StartForm } from "./start-form";

export default async function LogPage() {
  const r = await scoped();
  const [unit, active] = await Promise.all([r.getUnit(), r.activeWorkout()]);
  if (!active) return (<><h1>Ready to lift?</h1><StartForm /></>);

  const [exs, lastKg, rows] = await Promise.all([r.listExercises(), r.lastSets(), r.workoutSets(active.id)]);
  const last = Object.fromEntries(
    Object.entries(lastKg).map(([id, v]) => [id, { reps: v.reps, weight: fromKg(v.weightKg, unit) }]),
  );
  const groups = new Map<string, typeof rows>();
  for (const s of rows) groups.set(s.exercise, [...(groups.get(s.exercise) ?? []), s]);

  return (
    <>
      <h1>{active.name}</h1>
      <p className="mute">{active.date}</p>
      <div className="card"><SetForm workoutId={active.id} exercises={exs} last={last} unit={unit} /></div>
      {[...groups].map(([name, list]) => (
        <div className="card" key={name}>
          <h2>{name}</h2>
          {list.map((s, i) => (
            <div className="set" key={s.id}>
              <span><span className="big">{fromKg(s.weightKg, unit)} {unit}</span> × {s.reps}
                {s.rpe ? <span className="mute"> @ RPE {s.rpe}</span> : null}</span>
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
