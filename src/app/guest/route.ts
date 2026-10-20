import { NextResponse } from "next/server";
import { GUEST_COOKIE, GUEST_MAX_AGE, isGuestId, newGuestId } from "@/lib/guest-id";

// POST /guest starts (or resumes) a demo session, then sends the visitor into the app.
export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/log", req.url), 303);
  const existing = req.headers.get("cookie")?.match(new RegExp(`${GUEST_COOKIE}=([^;]+)`))?.[1];
  res.cookies.set(GUEST_COOKIE, isGuestId(existing) ? existing : newGuestId(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GUEST_MAX_AGE,
  });
  return res;
}
