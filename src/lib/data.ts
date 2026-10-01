import "server-only";
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { exercises, routineExercises, routines, sets, userSettings, workoutExercises, workouts } from "@/db/schema";
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

  /** Exercises in a workout: planned/ordered ones first, then any that only exist via logged sets (older workouts). */
  async function workoutExs(workoutId: string) {
    const planned = await db
      .select({ exerciseId: workoutExercises.exerciseId, name: exercises.name, kind: exercises.kind })
      .from(workoutExercises)
      .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
      .where(and(eq(workoutExercises.userId, uid), eq(workoutExercises.workoutId, workoutId)))
      .orderBy(workoutExercises.position);
    const seen = new Set(planned.map((p) => p.exerciseId));
    const withSets = await db
      .select({ exerciseId: sets.exerciseId, name: exercises.name, kind: exercises.kind })
      .from(sets)
      .innerJoin(exercises, eq(sets.exerciseId, exercises.id))
      .where(and(eq(sets.userId, uid), eq(sets.workoutId, workoutId)))
      .orderBy(sets.createdAt);
    const extra: typeof planned = [];
    for (const r of withSets) if (!seen.has(r.exerciseId)) { seen.add(r.exerciseId); extra.push(r); }
    return [...planned, ...extra];
  }

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
    async startWorkout(date: string, name: string, exerciseIds: string[] = []) {
      const active = await this.activeWorkout();
      if (active) return active.id;
      const [w] = await db.insert(workouts).values({ userId: uid, date, name }).returning();
      const ids = await this.ownedExerciseIds([...new Set(exerciseIds)]);
      if (ids.length) {
        await db.insert(workoutExercises).values(
          ids.map((exerciseId, position) => ({ userId: uid, workoutId: w.id, exerciseId, position })),
        );
      }
      return w.id;
    },
    /** Keeps only exercise IDs this user owns, in the given order. */
    async ownedExerciseIds(ids: string[]) {
      if (!ids.length) return [] as string[];
      const rows = await db.select({ id: exercises.id }).from(exercises)
        .where(and(eq(exercises.userId, uid), inArray(exercises.id, ids)));
      const ok = new Set(rows.map((r) => r.id));
      return ids.filter((i) => ok.has(i));
    },
    lastWorkout: () =>
      db.query.workouts.findFirst({
        where: and(eq(workouts.userId, uid), isNotNull(workouts.finishedAt)),
        orderBy: [desc(workouts.date), desc(workouts.createdAt)],
      }),
    /** Turns "last" | "workout:<id>" | "routine:<id>" | anything else into a name + exercise list. */
    async resolveStart(from: string): Promise<{ name: string; exerciseIds: string[] }> {
      const [type, id] = from.split(":");
      if (type === "last" || type === "workout") {
        const w = type === "last"
          ? await this.lastWorkout()
          : await this.getWorkout(id ?? "");
        if (w) return { name: w.name, exerciseIds: (await workoutExs(w.id)).map((e) => e.exerciseId) };
      }
      if (type === "routine") {
        const rt = await db.query.routines.findFirst({ where: and(eq(routines.id, id ?? ""), eq(routines.userId, uid)) });
        if (rt) {
          const items = await db.select({ exerciseId: routineExercises.exerciseId }).from(routineExercises)
            .where(and(eq(routineExercises.routineId, rt.id), eq(routineExercises.userId, uid)))
            .orderBy(routineExercises.position);
          return { name: rt.name, exerciseIds: items.map((i) => i.exerciseId) };
        }
      }
      return { name: "", exerciseIds: [] };
    },
    async finishWorkout(id: string) {
      await db.update(workouts).set({ finishedAt: new Date() })
        .where(and(eq(workouts.id, id), eq(workouts.userId, uid)));
    },

    workoutSets: (workoutId: string) =>
      db.select({ id: sets.id, exerciseId: sets.exerciseId, exercise: exercises.name, kind: exercises.kind, reps: sets.reps, weightKg: sets.weightKg,
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
      const inWorkout = await db.select({ id: workoutExercises.id }).from(workoutExercises).where(
        and(eq(workoutExercises.userId, uid), eq(workoutExercises.workoutId, workoutId), eq(workoutExercises.exerciseId, exerciseId)),
      );
      if (!inWorkout.length) {
        const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(workoutExercises)
          .where(and(eq(workoutExercises.userId, uid), eq(workoutExercises.workoutId, workoutId)));
        await db.insert(workoutExercises).values({ userId: uid, workoutId, exerciseId, position: Number(n) });
      }
      await db.insert(sets).values({ userId: uid, workoutId, exerciseId, ...v });
    },
    async deleteSet(id: string) {
      await db.delete(sets).where(and(eq(sets.id, id), eq(sets.userId, uid)));
    },

    /** All sets from the most recent completed workout for each exercise. */
async lastSets() {
  const rows = await db
    .select({
      exerciseId: sets.exerciseId,
      workoutId: sets.workoutId,
      workoutDate: workouts.date,
      reps: sets.reps,
      weightKg: sets.weightKg,
      durationSec: sets.durationSec,
      distanceM: sets.distanceM,
      createdAt: sets.createdAt,
    })
    .from(sets)
    .innerJoin(workouts, eq(sets.workoutId, workouts.id))
    .where(
      and(
        eq(sets.userId, uid),
        isNotNull(workouts.finishedAt),
      ),
    )
    .orderBy(
      desc(workouts.date),
      desc(workouts.createdAt),
      sets.createdAt,
    )
    .limit(500);

  const latestWorkout = new Map<string, string>();

  for (const row of rows) {
    if (!latestWorkout.has(row.exerciseId)) {
      latestWorkout.set(row.exerciseId, row.workoutId);
    }
  }

  const out: Record<
    string,
    {
      workoutId: string;
      reps: number;
      weightKg: number;
      durationSec: number | null;
      distanceM: number | null;
    }[]
  > = {};

  for (const row of rows) {
    if (latestWorkout.get(row.exerciseId) !== row.workoutId) continue;

    (out[row.exerciseId] ??= []).push({
      workoutId: row.workoutId,
      reps: row.reps,
      weightKg: row.weightKg,
      durationSec: row.durationSec,
      distanceM: row.distanceM,
    });
  }

  return out;
},

    getWorkout: (id: string) =>
      db.query.workouts.findFirst({ where: and(eq(workouts.id, id), eq(workouts.userId, uid)) }),
    workoutExercises: (id: string) => workoutExs(id),
    async updateWorkout(id: string, name: string, notes: string | null) {
      await db.update(workouts).set({ name, notes }).where(and(eq(workouts.id, id), eq(workouts.userId, uid)));
    },
    async deleteWorkout(id: string) {
      await db.delete(sets).where(and(eq(sets.workoutId, id), eq(sets.userId, uid)));
      await db.delete(workoutExercises).where(and(eq(workoutExercises.workoutId, id), eq(workoutExercises.userId, uid)));
      await db.delete(workouts).where(and(eq(workouts.id, id), eq(workouts.userId, uid)));
    },
    async getSet(id: string) {
      const [row] = await db.select({ kind: exercises.kind }).from(sets)
        .innerJoin(exercises, eq(sets.exerciseId, exercises.id))
        .where(and(eq(sets.id, id), eq(sets.userId, uid)));
      return row;
    },
    async updateSet(
      id: string,
      v: { reps: number; weightKg: number; rpe: number | null; durationSec: number | null; distanceM: number | null },
    ) {
      await db.update(sets).set(v).where(and(eq(sets.id, id), eq(sets.userId, uid)));
    },

    async listRoutines() {
      const rs = await db.select().from(routines).where(eq(routines.userId, uid)).orderBy(routines.name);
      if (!rs.length) return [];
      const items = await db
        .select({ routineId: routineExercises.routineId, name: exercises.name })
        .from(routineExercises)
        .innerJoin(exercises, eq(routineExercises.exerciseId, exercises.id))
        .where(eq(routineExercises.userId, uid))
        .orderBy(routineExercises.position);
      return rs.map((r) => ({ ...r, exercises: items.filter((i) => i.routineId === r.id).map((i) => i.name) }));
    },
    async createRoutine(name: string, exerciseIds: string[]) {
      const ids = await this.ownedExerciseIds([...new Set(exerciseIds)]);
      if (!ids.length) return;
      const [rt] = await db.insert(routines).values({ userId: uid, name }).returning();
      await db.insert(routineExercises).values(
        ids.map((exerciseId, position) => ({ userId: uid, routineId: rt.id, exerciseId, position })),
      );
    },
    async routineFromWorkout(workoutId: string, name: string) {
      if (!(await owns.workout(workoutId))) return;
      await this.createRoutine(name, (await workoutExs(workoutId)).map((e) => e.exerciseId));
    },
    async deleteRoutine(id: string) {
      await db.delete(routineExercises).where(and(eq(routineExercises.routineId, id), eq(routineExercises.userId, uid)));
      await db.delete(routines).where(and(eq(routines.id, id), eq(routines.userId, uid)));
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
      db
        .select({
          id: workouts.id,
          date: workouts.date,
          name: workouts.name,
          sets: sql<number>`count(${sets.id})`,
          volumeKg: sql<number>`coalesce(sum(${sets.weightKg} * ${sets.reps}), 0)`,
          muscleGroups: sql<string>`
            coalesce(
              group_concat(distinct ${exercises.muscleGroup}),
              ''
            )
          `,
        })
        .from(workouts)
        .leftJoin(sets, eq(sets.workoutId, workouts.id))
        .leftJoin(exercises, eq(sets.exerciseId, exercises.id))
        .where(eq(workouts.userId, uid))
        .groupBy(workouts.id)
        .orderBy(desc(workouts.date), desc(workouts.createdAt))
        .limit(100),
  };
}

export const fromKg = (kg: number, unit: Unit) =>
  Math.round((unit === "lb" ? kg / KG_PER_LB : kg) * 10) / 10;
export const toKg = (v: number, unit: Unit) => (unit === "lb" ? v * KG_PER_LB : v);
