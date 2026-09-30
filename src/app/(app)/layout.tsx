import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav>
        <Link href="/log">Log</Link>
        <Link href="/history">History</Link>
        <Link href="/progress">Progress</Link>
        <Link href="/routines">Routines</Link>
        <Link href="/settings">Settings</Link>
        <span className="grow" />
        <UserButton />
      </nav>
      <main>{children}</main>
    </>
  );
}
