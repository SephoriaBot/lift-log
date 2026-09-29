"use client";
import { useState } from "react";
import { addSet } from "@/app/actions";

type Ex = { id: string; name: string };
type Last = Record<string, { reps: number; weight: number }>;

export function SetForm({ workoutId, exercises, last, unit }: { workoutId: string; exercises: Ex[]; last: Last; unit: string }) {
  const [ex, setEx] = useState(exercises[0]?.id ?? "");
  const [adding, setAdding] = useState(exercises.length === 0);
  const prefill = last[ex];
  return (
    <form action={addSet} className="stack" key={`${ex}-${prefill?.weight}-${prefill?.reps}`}>
      <input type="hidden" name="workoutId" value={workoutId} />
      {adding ? (
        <div className="row">
          <label>Exercise name<input name="newExercise" required autoFocus /></label>
          <label>Muscle group<input name="muscle" /></label>
        </div>
      ) : (
        <label>Exercise
          <select name="exerciseId" value={ex} onChange={(e) => setEx(e.target.value)}>
            {exercises.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </label>
      )}
      <div className="row">
        <label>Weight ({unit})<input name="weight" type="number" step="0.5" min="0" inputMode="decimal" defaultValue={adding ? "" : prefill?.weight} required /></label>
        <label>Reps<input name="reps" type="number" min="1" inputMode="numeric" defaultValue={adding ? "" : prefill?.reps} required /></label>
        <label>RPE<input name="rpe" type="number" step="0.5" min="1" max="10" inputMode="decimal" /></label>
      </div>
      <div className="row">
        <button type="submit">Add set</button>
        <button type="button" className="ghost" onClick={() => setAdding((a) => !a)}>
          {adding && exercises.length ? "Pick existing" : "New exercise"}
        </button>
      </div>
    </form>
  );
}
