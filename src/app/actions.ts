"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { scoped, toKg } from "@/lib/data";
import { distToM, type Kind, type Unit } from "@/lib/metrics";
import { LIMITS, LimitError, cleanDate, inRange } from "@/lib/limits";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string) => {
  const v = parseFloat(str(fd, k));
  return Number.isFinite(v) ? v : NaN;
};
const text = (fd: FormData, k: string, max: number) => str(fd, k).slice(0, max);
const refresh = () => revalidatePath("/", "layout");
// Hitting an account limit is silent (like other rejected input); anything else is a real error.
const swallowLimit = (e: unknown) => {
  if (!(e instanceof LimitError)) throw e;
};

/** Reads the set fields for an exercise kind; null if the input isn't valid or is out of range. */
function setPayload(kind: Kind, fd: FormData, unit: Unit) {
  const reps = parseInt(str(fd, "reps"), 10);
  const weight = num(fd, "weight");
  const minutes = num(fd, "minutes");
  const distance = num(fd, "distance");
  const rpeRaw = num(fd, "rpe");
  const rpe = inRange(rpeRaw, 1, 10) ? rpeRaw : null;

  if (kind === "strength") {
    if (!inRange(reps, 1, 10000) || !inRange(weight, 0, 5000)) return null;
    return { reps, weightKg: toKg(weight, unit), rpe, durationSec: null, distanceM: null };
  }
  if (kind === "bodyweight") {
    if (!inRange(reps, 1, 10000)) return null;
    const w = inRange(weight, 0.0001, 5000) ? weight : 0;
    return { reps, weightKg: w > 0 ? toKg(w, unit) : 0, rpe, durationSec: null, distanceM: null };
  }
  if (!inRange(minutes, 0.0001, 1440)) return null;
  const d = inRange(distance, 0.0001, 10000) ? distance : 0;
  return { reps: 0, weightKg: 0, rpe: null, durationSec: Math.round(minutes * 60), distanceM: d > 0 ? distToM(d, unit) : null };
}

export async function startWorkout(fd: FormData) {
  const r = await scoped();
  const plan = await r.resolveStart(str(fd, "from"));
  const date = cleanDate(str(fd, "date")) ?? new Date().toISOString().slice(0, 10);
  try {
    await r.startWorkout(date, text(fd, "name", LIMITS.nameLen) || plan.name || "Workout", plan.exerciseIds);
  } catch (e) {
    swallowLimit(e);
  }
  refresh();
  redirect("/log");
}

export async function finishWorkout(fd: FormData) {
  const r = await scoped();
  await r.finishWorkout(str(fd, "id"));
  refresh();
}

export async function addSet(fd: FormData) {
  const r = await scoped();
  const unit = await r.getUnit();
  let exerciseId = str(fd, "exerciseId");
  let kind: Kind;
  const newName = text(fd, "newExercise", LIMITS.nameLen);
  if (newName) {
    const k = str(fd, "kind");
    try {
      const made = await r.addExercise(newName, text(fd, "muscle", LIMITS.muscleLen) || null, k === "bodyweight" || k === "cardio" ? k : "strength");
      exerciseId = made.id;
      kind = made.kind;
    } catch (e) {
      swallowLimit(e);
      return;
    }
  } else {
    const ex = (await r.listExercises()).find((e) => e.id === exerciseId);
    if (!ex) return;
    kind = ex.kind;
  }
  const payload = setPayload(kind, fd, unit);
  if (!payload) return;
  try {
    await r.addSet(str(fd, "workoutId"), exerciseId, payload);
  } catch (e) {
    swallowLimit(e);
  }
  refresh();
}

export async function updateSet(fd: FormData) {
  const r = await scoped();
  const id = str(fd, "id");
  const existing = await r.getSet(id);
  if (!existing) return;
  const payload = setPayload(existing.kind, fd, await r.getUnit());
  if (!payload) return;
  await r.updateSet(id, payload);
  refresh();
}

export async function deleteSet(fd: FormData) {
  const r = await scoped();
  await r.deleteSet(str(fd, "id"));
  refresh();
}

export async function updateWorkout(fd: FormData) {
  const r = await scoped();
  await r.updateWorkout(str(fd, "id"), text(fd, "name", LIMITS.nameLen) || "Workout", text(fd, "notes", LIMITS.notesLen) || null);
  refresh();
}

export async function deleteWorkout(fd: FormData) {
  const r = await scoped();
  await r.deleteWorkout(str(fd, "id"));
  refresh();
  redirect("/history");
}

export async function saveRoutine(fd: FormData) {
  const r = await scoped();
  const name = text(fd, "name", LIMITS.nameLen);
  if (name) {
    try {
      await r.routineFromWorkout(str(fd, "workoutId"), name);
    } catch (e) {
      swallowLimit(e);
    }
  }
  refresh();
}

export async function createRoutine(fd: FormData) {
  const r = await scoped();
  const name = text(fd, "name", LIMITS.nameLen);
  if (name) {
    try {
      await r.createRoutine(name, fd.getAll("exerciseId").map(String).slice(0, LIMITS.routineExercises));
    } catch (e) {
      swallowLimit(e);
    }
  }
  refresh();
}

export async function deleteRoutine(fd: FormData) {
  const r = await scoped();
  await r.deleteRoutine(str(fd, "id"));
  refresh();
}

export async function setUnit(fd: FormData) {
  const r = await scoped();
  const unit = str(fd, "unit");
  if (unit === "kg" || unit === "lb") await r.setUnit(unit as Unit);
  refresh();
}
