"use server";
import { revalidatePath } from "next/cache";
import { scoped, toKg, type Unit } from "@/lib/data";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

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
}

export async function addSet(fd: FormData) {
  const r = await scoped();
  const unit = await r.getUnit();
  let exerciseId = str(fd, "exerciseId");
  const newName = str(fd, "newExercise");
  if (newName) exerciseId = await r.addExercise(newName, str(fd, "muscle") || null);
  const reps = parseInt(str(fd, "reps"), 10);
  const weight = parseFloat(str(fd, "weight"));
  const rpe = parseFloat(str(fd, "rpe"));
  if (!exerciseId || !(reps > 0) || !(weight >= 0)) return;
  await r.addSet(str(fd, "workoutId"), exerciseId, reps, toKg(weight, unit), rpe > 0 ? rpe : null);
  revalidatePath("/log");
}

export async function deleteSet(fd: FormData) {
  const r = await scoped();
  await r.deleteSet(str(fd, "id"));
  revalidatePath("/log");
}

export async function setUnit(fd: FormData) {
  const r = await scoped();
  const unit = str(fd, "unit");
  if (unit === "kg" || unit === "lb") await r.setUnit(unit as Unit);
  revalidatePath("/", "layout");
}
