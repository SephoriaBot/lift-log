"use server";
import { revalidatePath } from "next/cache";
import { scoped, toKg } from "@/lib/data";
import { distToM, type Kind, type Unit } from "@/lib/metrics";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string) => {
  const v = parseFloat(str(fd, k));
  return Number.isFinite(v) ? v : NaN;
};

export async function startWorkout(fd: FormData) {
  const r = await scoped();
  await r.startWorkout(str(fd, "date"), str(fd, "name") || "Workout");
  revalidatePath("/log");
}

export async function finishWorkout(fd: FormData) {
  const r = await scoped();
  await r.finishWorkout(str(fd, "id"));
  revalidatePath("/log");
  revalidatePath("/history");
  revalidatePath("/progress");
}

export async function addSet(fd: FormData) {
  const r = await scoped();
  const unit = await r.getUnit();
  let exerciseId = str(fd, "exerciseId");
  let kind: Kind;
  const newName = str(fd, "newExercise");
  if (newName) {
    const k = str(fd, "kind");
    const made = await r.addExercise(newName, str(fd, "muscle") || null, k === "bodyweight" || k === "cardio" ? k : "strength");
    exerciseId = made.id;
    kind = made.kind;
  } else {
    const ex = (await r.listExercises()).find((e) => e.id === exerciseId);
    if (!ex) return;
    kind = ex.kind;
  }

  const reps = parseInt(str(fd, "reps"), 10);
  const weight = num(fd, "weight");
  const minutes = num(fd, "minutes");
  const distance = num(fd, "distance");
  const rpe = num(fd, "rpe");
  const workoutId = str(fd, "workoutId");
  const base = { rpe: rpe > 0 ? rpe : null, durationSec: null as number | null, distanceM: null as number | null };

  if (kind === "strength") {
    if (!(reps > 0) || !(weight >= 0)) return;
    await r.addSet(workoutId, exerciseId, { ...base, reps, weightKg: toKg(weight, unit) });
  } else if (kind === "bodyweight") {
    if (!(reps > 0)) return;
    await r.addSet(workoutId, exerciseId, { ...base, reps, weightKg: weight > 0 ? toKg(weight, unit) : 0 });
  } else {
    if (!(minutes > 0)) return;
    await r.addSet(workoutId, exerciseId, {
      ...base, reps: 0, weightKg: 0,
      durationSec: Math.round(minutes * 60),
      distanceM: distance > 0 ? distToM(distance, unit as Unit) : null,
    });
  }
  revalidatePath("/log");
  revalidatePath("/progress");
}

export async function deleteSet(fd: FormData) {
  const r = await scoped();
  await r.deleteSet(str(fd, "id"));
  revalidatePath("/log");
  revalidatePath("/progress");
}

export async function setUnit(fd: FormData) {
  const r = await scoped();
  const unit = str(fd, "unit");
  if (unit === "kg" || unit === "lb") await r.setUnit(unit as Unit);
  revalidatePath("/", "layout");
}
