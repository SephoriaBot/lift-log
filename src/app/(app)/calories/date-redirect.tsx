"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const localISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Sends the page to the user's local "today" (the server only knows UTC). */
export function LocalDateRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/calories?date=${localISO()}`);
  }, [router]);
  return <p className="mute">Loading…</p>;
}
