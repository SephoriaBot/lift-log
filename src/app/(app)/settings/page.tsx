import { setUnit } from "@/app/actions";
import { scoped } from "@/lib/data";

export default async function SettingsPage() {
  const unit = await (await scoped()).getUnit();
  return (
    <>
      <h1>Settings</h1>
      <div className="card">
        <h2>Weight unit</h2>
        <p className="mute">Your data is stored in kilograms, so switching never changes your history.</p>
        <form action={setUnit} className="row">
          <button name="unit" value="lb" className={unit === "lb" ? "on" : "ghost"}>Pounds</button>
          <button name="unit" value="kg" className={unit === "kg" ? "on" : "ghost"}>Kilograms</button>
        </form>
      </div>
    </>
  );
}
