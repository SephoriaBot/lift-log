"use client";

const localISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** A form that stamps the user's local date (from their device) into a hidden `date` field on submit. */
export function DateForm({ action, className, children }: {
  action: (fd: FormData) => void | Promise<void>;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(e) => {
        const el = e.currentTarget.elements.namedItem("date") as HTMLInputElement | null;
        if (el) el.value = localISO();
      }}
    >
      <input type="hidden" name="date" />
      {children}
    </form>
  );
}
