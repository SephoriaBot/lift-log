import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/log");
  return (
    <main style={{ paddingTop: "5rem" }}>
      <h1>Liftlog</h1>
      <p>Log every set in seconds, see what you lifted last time, and watch the numbers climb.</p>
      <div className="row" style={{ marginTop: "1.5rem" }}>
        <Link href="/sign-up"><button style={{ width: "100%" }}>Create account</button></Link>
        <Link href="/sign-in"><button className="ghost" style={{ width: "100%" }}>Sign in</button></Link>
      </div>
    </main>
  );
}
