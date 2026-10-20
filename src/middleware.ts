import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { GUEST_COOKIE, isGuestId } from "@/lib/guest-id";

const isPublic = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)", "/guest(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const isGuest = isGuestId(req.cookies.get(GUEST_COOKIE)?.value);
  if (!isPublic(req) && !isGuest) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
