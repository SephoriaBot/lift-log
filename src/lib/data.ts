import "server-only";
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { exercises, sets, userSettings, workouts } from "@/db/schema";
import { score, type Kind } from "@/lib/metrics";

export const KG_PER_LB = 0.45359237;
export type Unit = "kg" | "lb";

/**
 * The ONLY door to the database. The user id comes from Clerk's session, never from
 * request input, and every query below is filtered by it (the app-level equivalent of RLS).
 */
export async function scoped() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  return repo(userId);
}

function repo(uid: string) {
  const owns = {
    workout: async (id: string) =>
      !!(await db.query.workouts.findFirst({ where: and(eq(workouts.id, id), eq(workouts.userId, uid)) })),
    exercise: async (id: string) =>
      !!(await db.query.exercises.findFirst({ where: and(eq(exercises.id, id), eq(exercises.userId, uid)) })),
  };

  return {
    async getUnit(): Promise<Unit> {
      const row = await db.query.userSettings.findFirst({ where: eq(userSettings.userId, uid) });
      return row?.unit ?? "lb";
    },
    async setUnit(unit: Unit) {
      await db.insert(userSettings).values({ userId: uid, unit })
        .onConflictDoUpdate({ target: userSettings.userId, set: { unit } });
    },

    listExercises: () =>
      db.select().from(exercises).where(eq(exercises.userId, uid)).orderBy(exercises.name),
    async addExercise(name: string, muscleGroup: string | null, kind: Kind) {
      await db.insert(exercises).values({ userId: uid, name, muscleGroup, kind }).onConflictDoNothing();
      const row = await db.query.exercises.findFirst({
        where: and(eq(exercises.userId, uid), eq(exercises.name, name)),
      });
      return { id: row!.id, kind: row!.kind };
    },

    activeWorkout: () =>
      db.query.workouts.findFirst({
        where: and(eq(workouts.userId, uid), isNull(workouts.finishedAt)),
        orderBy: desc(workouts.createdAt),
      }),
    async startWorkout(date: string, name: string) {
      const active = await this.activeWorkout();
      if (active) return active.id;
      const [w] = await db.insert(workouts).values({ userId: uid, date, name }).returning();
      return w.id;
    },
    async finishWorkout(id: string) {
      await db.update(workouts).set({ finishedAt: new Date() })
        .where(and(eq(workouts.id, id), eq(workouts.userId, uid)));
    },

    workoutSets: (workoutId: string) =>
      db.select({ id: sets.id, exercise: exercises.name, kind: exercises.kind, reps: sets.reps, weightKg: sets.weightKg,
        rpe: sets.rpe, durationSec: sets.durationSec, distanceM: sets.distanceM })
        .from(sets)
        .innerJoin(exercises, eq(sets.exerciseId, exercises.id))
        .where(and(eq(sets.userId, uid), eq(sets.workoutId, workoutId)))
        .orderBy(sets.createdAt),
    async addSet(
      workoutId: string,
      exerciseId: string,
      v: { reps: number; weightKg: number; rpe: number | null; durationSec: number | null; distanceM: number | null },
    ) {
      // Reject IDs that belong to someone else before inserting.
      if (!(await owns.workout(workoutId)) || !(await owns.exercise(exerciseId))) throw new Error("Not found");
      await db.insert(sets).values({ userId: uid, workoutId, exerciseId, ...v });
    },
    async deleteSet(id: string) {
      await db.delete(sets).where(and(eq(sets.id, id), eq(sets.userId, uid)));
    },

    /** Most recent set per exercise, used to prefill the log form. */
    async lastSets() {
      const rows = await db
        .select({ exerciseId: sets.exerciseId, reps: sets.reps, weightKg: sets.weightKg,
          durationSec: sets.durationSec, distanceM: sets.distanceM })
        .from(sets)
        .innerJoin(workouts, eq(sets.workoutId, workouts.id))
        .where(eq(sets.userId, uid))
        .orderBy(desc(workouts.date), desc(sets.createdAt))
        .limit(500);
      const out: Record<string, { reps: number; weightKg: number; durationSec: number | null; distanceM: number | null }> = {};
      for (const r of rows) out[r.exerciseId] ??= r;
      return out;
    },

    /** Sets in this workout that beat every earlier set for the same exercise (first-ever set is a baseline, not a PR). */
    async prSetIds(workoutId: string) {
      const inWorkout = await db.select({ exerciseId: sets.exerciseId }).from(sets)
        .where(and(eq(sets.userId, uid), eq(sets.workoutId, workoutId)));
      const ids = [...new Set(inWorkout.map((r) => r.exerciseId))];
      if (!ids.length) return [] as string[];
      const rows = await db
        .select({ id: sets.id, exerciseId: sets.exerciseId, workoutId: sets.workoutId, kind: exercises.kind,
          reps: sets.reps, weightKg: sets.weightKg, durationSec: sets.durationSec, distanceM: sets.distanceM })
        .from(sets)
        .innerJoin(exercises, eq(sets.exerciseId, exercises.id))
        .where(and(eq(sets.userId, uid), inArray(sets.exerciseId, ids)))
        .orderBy(sets.createdAt);
      const best = new Map<string, number>();
      const prs: string[] = [];
      for (const r of rows) {
        const sc = score(r.kind, r);
        const prev = best.get(r.exerciseId);
        if (prev !== undefined && sc > prev && r.workoutId === workoutId) prs.push(r.id);
        if (prev === undefined || sc > prev) best.set(r.exerciseId, sc);
      }
      return prs;
    },

    series: (exerciseId: string) =>
      db.select({ date: workouts.date, reps: sets.reps, weightKg: sets.weightKg,
        durationSec: sets.durationSec, distanceM: sets.distanceM })
        .from(sets)
        .innerJoin(workouts, eq(sets.workoutId, workouts.id))
        .where(and(eq(sets.userId, uid), eq(sets.exerciseId, exerciseId)))
        .orderBy(workouts.date, sets.createdAt),

    /** Best set ever per exercise. */
    async bests() {
      const rows = await db
        .select({ exerciseId: exercises.id, name: exercises.name, kind: exercises.kind, date: workouts.date,
          reps: sets.reps, weightKg: sets.weightKg, durationSec: sets.durationSec, distanceM: sets.distanceM })
        .from(sets)
        .innerJoin(exercises, eq(sets.exerciseId, exercises.id))
        .innerJoin(workouts, eq(sets.workoutId, workouts.id))
        .where(eq(sets.userId, uid))
        .limit(5000);
      const best = new Map<string, (typeof rows)[number]>();
      for (const r of rows) {
        const p = best.get(r.exerciseId);
        if (!p || score(r.kind, r) > score(p.kind, p)) best.set(r.exerciseId, r);
      }
      return [...best.values()].sort((a, b) => a.name.localeCompare(b.name));
    },

    /** Distinct dates (YYYY-MM-DD) with at least one logged set, newest first. */
    async trainingDays() {
      const rows = await db.selectDistinct({ date: workouts.date }).from(workouts)
        .innerJoin(sets, eq(sets.workoutId, workouts.id))
        .where(eq(workouts.userId, uid)).orderBy(desc(workouts.date)).limit(400);
      return rows.map((r) => r.date);
    },

    history: () =>
      db.select({
        id: workouts.id,
        date: workouts.date,
        name: workouts.name,
        sets: sql<number>`count(${sets.id})`,
        volumeKg: sql<number>`coalesce(sum(${sets.weightKg} * ${sets.reps}), 0)`,
      })
        .from(workouts)
        .leftJoin(sets, eq(sets.workoutId, workouts.id))
        .where(eq(workouts.userId, uid))
        .groupBy(workouts.id)
        .orderBy(desc(workouts.date), desc(workouts.createdAt))
        .limit(100),
  };
}

export const fromKg = (kg: number, unit: Unit) =>
  Math.round((unit === "lb" ? kg / KG_PER_LB : kg) * 10) / 10;
export const toKg = (v: number, unit: Unit) => (unit === "lb" ? v * KG_PER_LB : v);
