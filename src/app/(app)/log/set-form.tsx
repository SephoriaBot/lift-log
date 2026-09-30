"use client";

import { useEffect, useState } from "react";
import { addSet } from "@/app/actions";

type Kind = "strength" | "bodyweight" | "cardio";

type Ex = {
  id: string;
  name: string;
  kind: Kind;
};

type Last = Record<
  string,
  {
    reps: number;
    weight: number;
    minutes: number;
    distance: number;
  }
>;

const REST_KEY = "lift-log:rest-until";

export function SetForm({
  workoutId,
  exercises,
  last,
  unit,
  initialEx,
}: {
  workoutId: string;
  exercises: Ex[];
  last: Last;
  unit: string;
  initialEx?: string;
}) {
  const [ex, setEx] = useState(
    exercises.some((e) => e.id === initialEx)
      ? initialEx!
      : exercises[0]?.id ?? "",
  );

  const [adding, setAdding] = useState(exercises.length === 0);
  const [newKind, setNewKind] = useState<Kind>("strength");

  const [restSeconds, setRestSeconds] = useState(90);
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const kind: Kind = adding
    ? newKind
    : exercises.find((e) => e.id === ex)?.kind ?? "strength";

  const p = adding ? undefined : last[ex];

  const distUnit = unit === "lb" ? "mi" : "km";

  const exerciseName = exercises.find((e) => e.id === ex)?.name;

  useEffect(() => {
    const saved = window.localStorage.getItem(REST_KEY);

    if (saved) {
      const until = Number(saved);

      if (Number.isFinite(until) && until > Date.now()) {
        setRestUntil(until);
      } else {
        window.localStorage.removeItem(REST_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (restUntil === null) return;

    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);

      if (restUntil <= current) {
        window.localStorage.removeItem(REST_KEY);
        setRestUntil(null);
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, [restUntil]);

  const remaining = restUntil
    ? Math.max(0, Math.ceil((restUntil - now) / 1000))
    : 0;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  const startRest = (duration: number) => {
    const until = Date.now() + duration * 1000;
    window.localStorage.setItem(REST_KEY, String(until));
    setRestUntil(until);
    setNow(Date.now());
  };

  const pauseRest = () => {
    window.localStorage.removeItem(REST_KEY);
    setRestUntil(null);
  };

  const resetRest = () => {
    startRest(restSeconds);
  };

  return (
    <>
      <form
        action={addSet}
        className="stack"
        onSubmit={() => {
          startRest(restSeconds);
        }}
        key={`${ex}-${adding}-${kind}-${p?.weight}-${p?.reps}-${p?.minutes}`}
      >
        <input type="hidden" name="workoutId" value={workoutId} />

        {adding ? (
          <>
            <div className="row">
              <label>
                Exercise name
                <input name="newExercise" required autoFocus />
              </label>

              <label>
                Type
                <select
                  name="kind"
                  value={newKind}
                  onChange={(e) => setNewKind(e.target.value as Kind)}
                >
                  <option value="strength">
                    Weights (weight × reps)
                  </option>
                  <option value="bodyweight">
                    Bodyweight (reps)
                  </option>
                  <option value="cardio">
                    Cardio / timed
                  </option>
                </select>
              </label>
            </div>

            <label>
              Muscle group (optional)
              <input name="muscle" />
            </label>
          </>
        ) : (
          <>
            <label>
              Exercise
              <select
                name="exerciseId"
                value={ex}
                onChange={(e) => setEx(e.target.value)}
              >
                {exercises.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>

            {p && (
              <div
                className="card"
                style={{
                  padding: "0.75rem 1rem",
                  marginTop: "-0.25rem",
                  marginBottom: "0.25rem",
                }}
              >
                <div className="mute" style={{ fontSize: "0.85rem" }}>
                  Last time · {exerciseName}
                </div>

                {kind === "strength" && (
                  <>
                    <strong>
                      {p.weight} {unit} × {p.reps}
                      {p.weight === 0 && " (bodyweight)"}
                    </strong>
                    <div
                      className="mute"
                      style={{
                        fontSize: "0.85rem",
                        marginTop: "0.2rem",
                      }}
                    >
                      Progression idea: try the same weight for 1 more rep
                    </div>
                  </>
                )}

                {kind === "bodyweight" && (
                  <>
                    <strong>
                      {p.reps} reps
                      {p.weight > 0 && ` + ${p.weight} ${unit}`}
                    </strong>
                    <div
                      className="mute"
                      style={{
                        fontSize: "0.85rem",
                        marginTop: "0.2rem",
                      }}
                    >
                      Progression idea: try 1 more rep
                    </div>
                  </>
                )}

                {kind === "cardio" && (
                  <>
                    <strong>
                      {p.minutes} min
                      {p.distance > 0 && ` · ${p.distance} ${distUnit}`}
                    </strong>
                    <div
                      className="mute"
                      style={{
                        fontSize: "0.85rem",
                        marginTop: "0.2rem",
                      }}
                    >
                      Progression idea: match or slightly exceed last time
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {kind === "strength" && (
          <div className="row">
            <label>
              Weight ({unit})
              <input
                name="weight"
                type="number"
                step="0.5"
                min="0"
                inputMode="decimal"
                defaultValue={p?.weight}
                required
              />
            </label>

            <label>
              Reps
              <input
                name="reps"
                type="number"
                min="1"
                inputMode="numeric"
                defaultValue={p?.reps}
                required
              />
            </label>

            <label>
              RPE
              <input
                name="rpe"
                type="number"
                step="0.5"
                min="1"
                max="10"
                inputMode="decimal"
              />
            </label>
          </div>
        )}

        {kind === "bodyweight" && (
          <div className="row">
            <label>
              Reps
              <input
                name="reps"
                type="number"
                min="1"
                inputMode="numeric"
                defaultValue={p?.reps}
                required
              />
            </label>

            <label>
              Added weight ({unit})
              <input
                name="weight"
                type="number"
                step="0.5"
                min="0"
                inputMode="decimal"
              />
            </label>
          </div>
        )}

        {kind === "cardio" && (
          <div className="row">
            <label>
              Minutes
              <input
                name="minutes"
                type="number"
                step="0.5"
                min="0.5"
                inputMode="decimal"
                defaultValue={p?.minutes || undefined}
                required
              />
            </label>

            <label>
              Distance ({distUnit})
              <input
                name="distance"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                defaultValue={p?.distance || undefined}
              />
            </label>
          </div>
        )}

        <div className="row">
          <button type="submit">Add set</button>

          <button
            type="button"
            className="ghost"
            onClick={() => setAdding((a) => !a)}
          >
            {adding && exercises.length ? "Pick existing" : "New exercise"}
          </button>
        </div>
      </form>

      <div
        className="card"
        style={{
          marginTop: "0.75rem",
          textAlign: "center",
          padding: "1rem",
        }}
      >
        <div className="mute" style={{ fontSize: "0.85rem" }}>
          Rest timer
        </div>

        <div
          style={{
            fontSize: "2rem",
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            margin: "0.2rem 0 0.5rem",
          }}
        >
          {minutes}:{String(seconds).padStart(2, "0")}
        </div>

        <div
          className="row"
          style={{
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {[60, 90, 120, 180].map((duration) => (
            <button
              key={duration}
              type="button"
              className={restSeconds === duration ? "" : "ghost"}
              onClick={() => {
                setRestSeconds(duration);
                startRest(duration);
              }}
            >
              {duration / 60} min
            </button>
          ))}
        </div>

        {restUntil !== null && (
          <div
            className="row"
            style={{
              justifyContent: "center",
              marginTop: "0.5rem",
            }}
          >
            <button type="button" className="ghost" onClick={pauseRest}>
              Stop
            </button>
            <button type="button" className="ghost" onClick={resetRest}>
              Reset
            </button>
          </div>
        )}
      </div>
    </>
  );
}