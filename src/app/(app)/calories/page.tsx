import Link from "next/link";
import { addFood, deleteFood } from "@/app/actions";
import { scoped } from "@/lib/data";
import { cleanDate } from "@/lib/limits";
import { LocalDateRedirect } from "./date-redirect";

const shift = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export default async function CaloriesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: raw } = await searchParams;
  const date = cleanDate(raw ?? "");

  if (!date) {
    return (
      <>
        <h1>Calories</h1>
        <LocalDateRedirect />
      </>
    );
  }

  const r = await scoped();
  const [foods, totals] = await Promise.all([r.foodForDate(date), r.foodTotals(14)]);
  const dayTotal = foods.reduce((sum, f) => sum + f.calories, 0);

  return (
    <>
      <h1>Calories</h1>

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <Link href={`/calories?date=${shift(date, -1)}`}>← Prev</Link>
          <strong>{date}</strong>
          <Link href={`/calories?date=${shift(date, 1)}`}>Next →</Link>
        </div>

        <div style={{ margin: "1rem 0" }}>
          <div className="mute">Total for this day</div>
          <strong className="big">{dayTotal.toLocaleString()} cal</strong>
        </div>

        {foods.length === 0 ? (
          <p className="mute">Nothing logged yet.</p>
        ) : (
          foods.map((f) => (
            <form action={deleteFood} className="set" key={f.id}>
              <input type="hidden" name="id" value={f.id} />
              <span>{f.name}</span>
              <span>
                <span className="big">{f.calories.toLocaleString()} cal</span>{" "}
                <button type="submit" className="ghost">Delete</button>
              </span>
            </form>
          ))
        )}
      </div>

      <form action={addFood} className="stack card">
        <h2>Add food</h2>
        <input type="hidden" name="date" value={date} />
        <label>
          Food
          <input name="name" placeholder="Chicken and rice" maxLength={80} required />
        </label>
        <label>
          Calories
          <input name="calories" type="number" inputMode="numeric" min={0} max={20000} placeholder="550" required />
        </label>
        <button type="submit">Add</button>
      </form>

      {totals.length > 0 && (
        <div className="card">
          <h2>Recent days</h2>
          {totals.map((t) => (
            <div className="set" key={t.date}>
              <Link href={`/calories?date=${t.date}`}>{t.date}</Link>
              <span className="big">{t.total.toLocaleString()} cal</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
