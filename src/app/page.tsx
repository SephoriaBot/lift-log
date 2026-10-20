import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getGuestId } from "@/lib/guest";

export default async function Home() {
  const { userId } = await auth();
  if (userId || (await getGuestId())) redirect("/log");
  return (
    <main style={{ paddingTop: "5rem" }}>
      <h1>Liftlog</h1>
      <p>Log every set in seconds and track your progress.</p>
      <div className="row" style={{ marginTop: "1.5rem" }}>
        <Link href="/sign-up"><button style={{ width: "100%" }}>Create account</button></Link>
        <Link href="/sign-in"><button className="ghost" style={{ width: "100%" }}>Sign in</button></Link>
      </div>
      <form action="/guest" method="post" style={{ marginTop: "1rem" }}>
        <button className="ghost" style={{ width: "100%" }}>Try the demo (no sign-in)</button>
        <p className="mute" style={{ fontSize: "0.8rem", textAlign: "center" }}>
          Guest data stays in this browser session and is wiped when you exit the demo.
        </p>
      </form>
    </main>
  );
}
