import { createRoutine, deleteRoutine, startWorkout } from "@/app/actions";
import { DateForm } from "@/components/date-form";
import { scoped } from "@/lib/data";

export default async function RoutinesPage() {
  const r = await scoped();
  const [routines, exs] = await Promise.all([r.listRoutines(), r.listExercises()]);
  return (
    <>
      <h1>Routines</h1>
      {routines.length === 0 && <p className="mute">No routines yet. Save one from a workout, or build one below.</p>}
      {routines.map((rt) => (
        <div className="card" key={rt.id}>
          <h2>{rt.name}</h2>
          <p className="mute">{rt.exercises.join(", ")}</p>
          <div className="row">
            <DateForm action={startWorkout}>
              <input type="hidden" name="from" value={`routine:${rt.id}`} />
              <button type="submit" style={{ width: "100%" }}>Start</button>
            </DateForm>
            <form action={deleteRoutine}>
              <input type="hidden" name="id" value={rt.id} />
              <button type="submit" className="ghost" style={{ width: "100%" }}>Delete</button>
            </form>
          </div>
        </div>
      ))}
      {exs.length > 0 && (
        <form action={createRoutine} className="stack card">
          <h2>New routine</h2>
          <label>Name<input name="name" required placeholder="Leg day + cardio" /></label>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="mute">Exercises (listed in alphabetical order)</legend>
            {exs.map((e) => (
              <label key={e.id} style={{ display: "flex", alignItems: "center", gap: ".5rem", color: "var(--ink)", padding: ".25rem 0" }}>
                <input type="checkbox" name="exerciseId" value={e.id} style={{ width: "auto" }} />{e.name}
              </label>
            ))}
          </fieldset>
          <button type="submit">Save routine</button>
        </form>
      )}
    </>
  );
}
