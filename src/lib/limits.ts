// Per-account ceilings. Generous enough that normal use never hits them, but they stop
// one account from filling the free database.
export const LIMITS = {
  exercises: 500,
  workouts: 10000,
  setsPerWorkout: 300,
  routines: 100,
  routineExercises: 50,
  nameLen: 80,
  muscleLen: 40,
  notesLen: 2000,
};

export class LimitError extends Error {}

// Returns "YYYY-MM-DD" only if it's a real calendar date in a sane range, else null.
export function cleanDate(s: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return null;
  const y = Number(s.slice(0, 4));
  return y >= 2000 && y <= 2100 ? s : null;
}

// True if v is a finite number within [min, max].
export const inRange = (v: number, min: number, max: number) =>
  Number.isFinite(v) && v >= min && v <= max;
