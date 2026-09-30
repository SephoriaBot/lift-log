import Link from "next/link";
import { deleteSet, finishWorkout, saveRoutine, startWorkout } from "@/app/actions";
import { DateForm } from "@/components/date-form";
import { scoped } from "@/lib/data";
import { describeSet, distFromM, kgTo } from "@/lib/metrics";
import { SetForm } from "./set-form";

export default async function LogPage({ searchParams }: { searchParams: Promise<{ ex?: string }> }) {
  const { ex } = await searchParams;
  const r = await scoped();
  const [unit, active] = await Promise.all([r.getUnit(), r.activeWorkout()]);

  if (!active) {
    const [routines, last] = await Promise.all([r.listRoutines(), r.lastWorkout()]);
    return (
      <>
        <h1>Ready to train?</h1>
        <DateForm action={startWorkout} className="stack card">
          <input type="hidden" name="from" value="empty" />
          <label>Workout name<input name="name" placeholder="Push day" /></label>
          <button type="submit">Start empty workout</button>
        </DateForm>
        {last && (
          <DateForm action={startWorkout} className="card">
            <input type="hidden" name="from" value="last" />
            <button type="submit" className="ghost" style={{ width: "100%" }}>Repeat last workout: {last.name}</button>
          </DateForm>
        )}
        {routines.length > 0 && (
          <div className="card">
            <h2>Routines</h2>
            {routines.map((rt) => (
              <DateForm key={rt.id} action={startWorkout} className="set">
                <input type="hidden" name="from" value={`routine:${rt.id}`} />
                <span>{rt.name}<br /><span className="mute">{rt.exercises.join(", ")}</span></span>
                <button type="submit">Start</button>
              </DateForm>
            ))}
          </div>
        )}
      </>
    );
  }

  const [exs, lastRaw, rows, prIds, planned] = await Promise.all([
    r.listExercises(), r.lastSets(), r.workoutSets(active.id), r.prSetIds(active.id), r.workoutExercises(active.id),
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

  return (
    <>
      <h1>{active.name}</h1>
      <p className="mute">{active.date} · <Link href={`/history/${active.id}`}>Notes and edit</Link></p>
      <div className="card" id="log">
        <SetForm key={ex ?? "none"} workoutId={active.id} initialEx={ex}
          exercises={exs.map((e) => ({ id: e.id, name: e.name, kind: e.kind }))} last={last} unit={unit} />
      </div>
      {planned.map((p) => {
        const list = rows.filter((s) => s.exerciseId === p.exerciseId);
        return (
          <div className="card" key={p.exerciseId}>
            <div className="set" style={{ borderTop: 0, paddingTop: 0 }}>
              <h2 style={{ margin: 0 }}>{p.name}</h2>
              <Link href={`/log?ex=${p.exerciseId}#log`}>Log set</Link>
            </div>
            {list.length === 0 && <p className="mute" style={{ margin: 0 }}>No sets yet.</p>}
            {list.map((s, i) => (
              <div className="set" key={s.id}>
                <span>
                  <span className="big">{describeSet(s.kind, s, unit)}</span>
                  {prs.has(s.id) && <strong style={{ color: "var(--accent)", marginLeft: ".5rem" }}>New PR</strong>}
                </span>
                <form action={deleteSet}><input type="hidden" name="id" value={s.id} />
                  <button className="link" aria-label={`Delete set ${i + 1} of ${p.name}`}>Delete</button></form>
              </div>
            ))}
          </div>
        );
      })}
      {planned.length > 0 && (
        <details className="card">
          <summary>Save as routine</summary>
          <form action={saveRoutine} className="stack" style={{ marginTop: ".75rem" }}>
            <input type="hidden" name="workoutId" value={active.id} />
            <label>Routine name<input name="name" required defaultValue={active.name} /></label>
            <button type="submit">Save routine</button>
          </form>
        </details>
      )}
      <form action={finishWorkout}><input type="hidden" name="id" value={active.id} />
        <button className="ghost" style={{ width: "100%" }}>Finish workout</button></form>
    </>
  );
}
