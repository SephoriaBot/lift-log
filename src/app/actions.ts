"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { scoped, toKg } from "@/lib/data";
import { distToM, type Kind, type Unit } from "@/lib/metrics";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string) => {
  const v = parseFloat(str(fd, k));
  return Number.isFinite(v) ? v : NaN;
};
const refresh = () => revalidatePath("/", "layout");

/** Reads the set fields for an exercise kind; null if the input isn't valid. */
function setPayload(kind: Kind, fd: FormData, unit: Unit) {
  const reps = parseInt(str(fd, "reps"), 10);
  const weight = num(fd, "weight");
  const minutes = num(fd, "minutes");
  const distance = num(fd, "distance");
  const rpe = num(fd, "rpe") > 0 ? num(fd, "rpe") : null;
  if (kind === "strength")
    return reps > 0 && weight >= 0 ? { reps, weightKg: toKg(weight, unit), rpe, durationSec: null, distanceM: null } : null;
  if (kind === "bodyweight")
    return reps > 0 ? { reps, weightKg: weight > 0 ? toKg(weight, unit) : 0, rpe, durationSec: null, distanceM: null } : null;
  return minutes > 0
    ? { reps: 0, weightKg: 0, rpe: null, durationSec: Math.round(minutes * 60), distanceM: distance > 0 ? distToM(distance, unit) : null }
    : null;
}

export async function startWorkout(fd: FormData) {
  const r = await scoped();
  const plan = await r.resolveStart(str(fd, "from"));
  const date = /^\d{4}-\d{2}-\d{2}$/.test(str(fd, "date")) ? str(fd, "date") : new Date().toISOString().slice(0, 10);
  await r.startWorkout(date, str(fd, "name") || plan.name || "Workout", plan.exerciseIds);
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
  const payload = setPayload(kind, fd, unit);
  if (!payload) return;
  await r.addSet(str(fd, "workoutId"), exerciseId, payload);
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
  await r.updateWorkout(str(fd, "id"), str(fd, "name") || "Workout", str(fd, "notes") || null);
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
  const name = str(fd, "name");
  if (name) await r.routineFromWorkout(str(fd, "workoutId"), name);
  refresh();
}

export async function createRoutine(fd: FormData) {
  const r = await scoped();
  const name = str(fd, "name");
  if (name) await r.createRoutine(name, fd.getAll("exerciseId").map(String));
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
