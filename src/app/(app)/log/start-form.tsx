"use client";
import { startWorkout } from "@/app/actions";

export function StartForm() {
  const local = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  return (
    <form
      action={startWorkout}
      className="stack card"
      onSubmit={(e) => ((e.currentTarget.elements.namedItem("date") as HTMLInputElement).value = local())}
    >
      <input type="hidden" name="date" />
      <label>Workout name<input name="name" placeholder="Push day" /></label>
      <button type="submit">Start workout</button>
    </form>
  );
}
