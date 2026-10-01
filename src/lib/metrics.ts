// Pure helpers shared by pages and the data layer (no server-only imports).
export type Kind = "strength" | "bodyweight" | "cardio";
export type Unit = "kg" | "lb";
export type SetLike = {
  reps: number;
  weightKg: number;
  durationSec: number | null;
  distanceM: number | null;
};

const KG_PER_LB = 0.45359237;
const round = (n: number, d = 1) =>
  Math.round(n * 10 ** d) / 10 ** d;

export const kgTo = (kg: number, u: Unit) =>
  round(u === "lb" ? kg / KG_PER_LB : kg);

export const distFromM = (m: number, u: Unit) =>
  round(u === "lb" ? m / 1609.344 : m / 1000, 2);

export const distToM = (d: number, u: Unit) =>
  u === "lb" ? d * 1609.344 : d * 1000;

export const distUnit = (u: Unit) =>
  u === "lb" ? "mi" : "km";

/** Comparable number for "is this set better than that one" (raw units, higher is better). */
export function score(kind: Kind, s: SetLike): number {
  if (kind === "strength") {
    return s.reps <= 0
      ? 0
      : s.reps === 1
        ? s.weightKg
        : s.weightKg * (1 + s.reps / 30); // Epley est. 1RM
  }

  if (kind === "bodyweight") return s.reps;

  return s.distanceM && s.distanceM > 0
    ? s.distanceM
    : (s.durationSec ?? 0);
}

/** Display value + label for a set's headline number (chart points, records). */
export function display(
  kind: Kind,
  s: SetLike,
  u: Unit,
): { value: number; label: string } {
  if (kind === "strength") {
    return {
      value: kgTo(score(kind, s), u),
      label: `${u} est. 1RM`,
    };
  }

  if (kind === "bodyweight") {
    return {
      value: s.reps,
      label: "reps",
    };
  }

  if (s.distanceM && s.distanceM > 0) {
    return {
      value: distFromM(s.distanceM, u),
      label: distUnit(u),
    };
  }

  return {
    value: round((s.durationSec ?? 0) / 60),
    label: "min",
  };
}

/**
 * Training volume for one set.
 *
 * Strength:
 *   weight × reps
 *
 * Bodyweight:
 *   reps, plus added weight when present
 *
 * Cardio:
 *   distance when available, otherwise minutes
 *
 * Values are kept in raw storage units so callers can convert
 * them for display later.
 */
export function volume(kind: Kind, s: SetLike): number {
  if (kind === "strength") {
    return Math.max(0, s.weightKg) * Math.max(0, s.reps);
  }

  if (kind === "bodyweight") {
    return Math.max(0, s.reps) *
      (1 + Math.max(0, s.weightKg));
  }

  return s.distanceM && s.distanceM > 0
    ? s.distanceM
    : (s.durationSec ?? 0) / 60;
}

export function describeSet(
  kind: Kind,
  s: SetLike & { rpe?: number | null },
  u: Unit,
): string {
  if (kind === "strength") {
    return `${kgTo(s.weightKg, u)} ${u} × ${s.reps}${
      s.rpe ? ` @ RPE ${s.rpe}` : ""
    }`;
  }

  if (kind === "bodyweight") {
    return `${s.reps} reps${
      s.weightKg > 0
        ? ` + ${kgTo(s.weightKg, u)} ${u}`
        : ""
    }`;
  }

  const min = round((s.durationSec ?? 0) / 60);

  return `${min} min${
    s.distanceM
      ? ` · ${distFromM(s.distanceM, u)} ${distUnit(u)}`
      : ""
  }`;
}