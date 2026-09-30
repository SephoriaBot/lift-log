import { notFound } from "next/navigation";
import { deleteSet, deleteWorkout, saveRoutine, startWorkout, updateSet, updateWorkout } from "@/app/actions";
import { DateForm } from "@/components/date-form";
import { scoped } from "@/lib/data";
import { describeSet, distFromM, distUnit, kgTo } from "@/lib/metrics";

type Row = Awaited<ReturnType<Awaited<ReturnType<typeof scoped>>["workoutSets"]>>[number];

function EditFields({ s, unit }: { s: Row; unit: "kg" | "lb" }) {
  if (s.kind === "cardio")
    return (
      <div className="row">
        <label>Minutes<input name="minutes" type="number" step="0.5" min="0.5" defaultValue={Math.round(((s.durationSec ?? 0) / 60) * 10) / 10} required /></label>
        <label>Distance ({distUnit(unit)})<input name="distance" type="number" step="0.01" min="0" defaultValue={s.distanceM ? distFromM(s.distanceM, unit) : ""} /></label>
      </div>
    );
  return (
    <div className="row">
      <label>{s.kind === "bodyweight" ? `Added weight (${unit})` : `Weight (${unit})`}
        <input name="weight" type="number" step="0.5" min="0" defaultValue={s.kind === "bodyweight" && s.weightKg === 0 ? "" : kgTo(s.weightKg, unit)} required={s.kind === "strength"} /></label>
      <label>Reps<input name="reps" type="number" min="1" defaultValue={s.reps} required /></label>
      {s.kind === "strength" && <label>RPE<input name="rpe" type="number" step="0.5" min="1" max="10" defaultValue={s.rpe ?? ""} /></label>}
    </div>
  );
}

export default async function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await scoped();
  const w = await r.getWorkout(id);
  if (!w) notFound();
  const [unit, exs, rows] = await Promise.all([r.getUnit(), r.workoutExercises(id), r.workoutSets(id)]);

  return (
    <>
      <h1>{w.name}</h1>
      <p className="mute">{w.date}{w.finishedAt ? "" : " · in progress"}</p>

      <form action={updateWorkout} className="stack card">
        <input type="hidden" name="id" value={id} />
        <label>Name<input name="name" defaultValue={w.name} required /></label>
        <label>Notes<input name="notes" defaultValue={w.notes ?? ""} placeholder="How did it feel?" /></label>
        <button type="submit">Save details</button>
      </form>

      {exs.map((e) => (
        <div className="card" key={e.exerciseId}>
          <h2>{e.name}</h2>
          {rows.filter((s) => s.exerciseId === e.exerciseId).map((s) => (
            <div key={s.id} style={{ borderTop: "1px solid var(--line)", padding: ".5rem 0" }}>
              <div className="set" style={{ borderTop: 0, padding: 0 }}>
                <span className="big">{describeSet(s.kind, s, unit)}</span>
                <form action={deleteSet}><input type="hidden" name="id" value={s.id} />
                  <button className="link" aria-label={`Delete this ${e.name} set`}>Delete</button></form>
              </div>
              <details>
                <summary>Edit</summary>
                <form action={updateSet} className="stack" style={{ marginTop: ".5rem" }}>
                  <input type="hidden" name="id" value={s.id} />
                  <EditFields s={s} unit={unit} />
                  <button type="submit">Save set</button>
                </form>
              </details>
            </div>
          ))}
        </div>
      ))}

      <div className="card">
        <DateForm action={startWorkout}>
          <input type="hidden" name="from" value={`workout:${id}`} />
          <button type="submit" style={{ width: "100%" }}>Do this workout again</button>
        </DateForm>
        <details style={{ marginTop: "1rem" }}>
          <summary>Save as routine</summary>
          <form action={saveRoutine} className="stack" style={{ marginTop: ".5rem" }}>
            <input type="hidden" name="workoutId" value={id} />
            <label>Routine name<input name="name" required defaultValue={w.name} /></label>
            <button type="submit">Save routine</button>
          </form>
        </details>
        <details style={{ marginTop: "1rem" }}>
          <summary>Delete workout</summary>
          <form action={deleteWorkout} style={{ marginTop: ".5rem" }}>
            <input type="hidden" name="id" value={id} />
            <p className="mute">This permanently deletes the workout and all its sets.</p>
            <button type="submit" className="ghost" style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>Yes, delete it</button>
          </form>
        </details>
      </div>
    </>
  );
}
