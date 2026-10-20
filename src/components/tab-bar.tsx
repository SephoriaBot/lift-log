"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/log", label: "Log" },
  { href: "/history", label: "History" },
  { href: "/progress", label: "Progress" },
  { href: "/best", label: "Best" },
  { href: "/calories", label: "Calories" },
  { href: "/routines", label: "Routines" },
  { href: "/settings", label: "Settings" },
];

export function TabBar() {
  const path = usePathname();
  return (
    <nav className="tabs" aria-label="Main">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} aria-current={path.startsWith(t.href) ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
