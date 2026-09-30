import { index, integer, real, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () =>
  integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date());

// Every table carries user_id (the Clerk user id). All access goes through src/lib/data.ts.
export const userSettings = sqliteTable("user_settings", {
  userId: text("user_id").primaryKey(),
  unit: text("unit", { enum: ["kg", "lb"] }).notNull().default("lb"),
});

export const exercises = sqliteTable(
  "exercises",
  {
    id: id(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    muscleGroup: text("muscle_group"),
    // strength = weight x reps, bodyweight = reps (+ optional added weight), cardio = time (+ optional distance)
    kind: text("kind", { enum: ["strength", "bodyweight", "cardio"] }).notNull().default("strength"),
    createdAt: createdAt(),
  },
  (t) => [unique().on(t.userId, t.name)],
);

export const workouts = sqliteTable(
  "workouts",
  {
    id: id(),
    userId: text("user_id").notNull(),
    date: text("date").notNull(), // YYYY-MM-DD in the user's local time
    name: text("name").notNull(),
    notes: text("notes"),
    finishedAt: integer("finished_at", { mode: "timestamp" }),
    createdAt: createdAt(),
  },
  (t) => [index("workouts_user_date").on(t.userId, t.date)],
);

// Weight is always stored in kg; the user's unit setting only affects display and input.
export const sets = sqliteTable(
  "sets",
  {
    id: id(),
    userId: text("user_id").notNull(),
    workoutId: text("workout_id").notNull().references(() => workouts.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id").notNull().references(() => exercises.id, { onDelete: "cascade" }),
    reps: integer("reps").notNull(),
    weightKg: real("weight_kg").notNull(),
    rpe: real("rpe"),
    // Cardio sets store reps = 0 and weight_kg = 0; distance is stored in meters.
    durationSec: integer("duration_sec"),
    distanceM: real("distance_m"),
    createdAt: createdAt(),
  },
  (t) => [index("sets_user_exercise").on(t.userId, t.exerciseId), index("sets_workout").on(t.workoutId)],
);

export const routines = sqliteTable("routines", {
  id: id(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  createdAt: createdAt(),
});

export const routineExercises = sqliteTable(
  "routine_exercises",
  {
    id: id(),
    userId: text("user_id").notNull(),
    routineId: text("routine_id").notNull().references(() => routines.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id").notNull().references(() => exercises.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (t) => [index("routine_exercises_routine").on(t.routineId)],
);

// Exercises planned for (or done in) a workout, in order. Filled by routines / "repeat last" and as sets are logged.
export const workoutExercises = sqliteTable(
  "workout_exercises",
  {
    id: id(),
    userId: text("user_id").notNull(),
    workoutId: text("workout_id").notNull().references(() => workouts.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id").notNull().references(() => exercises.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (t) => [unique().on(t.workoutId, t.exerciseId)],
);
