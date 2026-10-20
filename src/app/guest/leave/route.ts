import { NextResponse } from "next/server";
import { GUEST_COOKIE } from "@/lib/guest-id";
import { getGuestId, wipeGuestData } from "@/lib/guest";

// POST /guest/leave wipes the guest's demo data and ends the session.
export async function POST(req: Request) {
  const uid = await getGuestId();
  if (uid) await wipeGuestData(uid);
  const res = NextResponse.redirect(new URL("/", req.url), 303);
  res.cookies.delete(GUEST_COOKIE);
  return res;
}
