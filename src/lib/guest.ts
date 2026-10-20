import "server-only";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  exercises, foodEntries, routineExercises, routines, sets, userSettings, workoutExercises, workouts,
} from "@/db/schema";
import { GUEST_COOKIE, isGuestId } from "@/lib/guest-id";

/** The current visitor's guest id, or null if they have no (valid) guest cookie. */
export async function getGuestId(): Promise<string | null> {
  const v = (await cookies()).get(GUEST_COOKIE)?.value;
  return isGuestId(v) ? v : null;
}

/** Deletes everything a guest created. Only ever called with a validated guest id. */
export async function wipeGuestData(uid: string) {
  if (!isGuestId(uid)) return;
  await db.delete(sets).where(eq(sets.userId, uid));
  await db.delete(workoutExercises).where(eq(workoutExercises.userId, uid));
  await db.delete(routineExercises).where(eq(routineExercises.userId, uid));
  await db.delete(routines).where(eq(routines.userId, uid));
  await db.delete(foodEntries).where(eq(foodEntries.userId, uid));
  await db.delete(workouts).where(eq(workouts.userId, uid));
  await db.delete(exercises).where(eq(exercises.userId, uid));
  await db.delete(userSettings).where(eq(userSettings.userId, uid));
}
