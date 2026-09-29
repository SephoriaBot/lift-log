import { SignIn } from "@clerk/nextjs";
export default function Page() {
  return <main style={{ display: "grid", placeItems: "center", paddingTop: "3rem" }}><SignIn /></main>;
}
