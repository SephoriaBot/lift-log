import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { getGuestId } from "@/lib/guest";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  const isGuest = !userId && !!(await getGuestId());
  return (
    <>
      <nav>
        <Link href="/log">Log</Link>
        <Link href="/history">History</Link>
        <Link href="/progress">Progress</Link>
        <Link href="/best">Best</Link>
        <Link href="/calories">Calories</Link>
        <Link href="/routines">Routines</Link>
        <Link href="/settings">Settings</Link>
        <span className="grow" />
        {isGuest ? (
          <>
            <span className="mute">Guest demo</span>
            <Link href="/sign-up">Sign up</Link>
            <form action="/guest/leave" method="post">
              <button className="ghost">Exit demo</button>
            </form>
          </>
        ) : (
          <UserButton />
        )}
      </nav>
      <main>{children}</main>
    </>
  );
}
