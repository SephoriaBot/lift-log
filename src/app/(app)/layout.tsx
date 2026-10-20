import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { TabBar } from "@/components/tab-bar";
import { getGuestId } from "@/lib/guest";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  const isGuest = !userId && !!(await getGuestId());
  return (
    <>
      <header className="topbar">
        <strong>Liftlog</strong>
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
      </header>
      <main>{children}</main>
      <TabBar />
    </>
  );
}
