// Pure helpers (no server-only imports) so middleware can use them too.
export const GUEST_COOKIE = "ll_guest";
export const GUEST_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// "guest_" can never collide with a Clerk id ("user_...").
const GUEST_RE = /^guest_[0-9a-f]{32}$/;

export const isGuestId = (v: string | undefined | null): v is string => !!v && GUEST_RE.test(v);

export const newGuestId = () => `guest_${crypto.randomUUID().replace(/-/g, "")}`;
