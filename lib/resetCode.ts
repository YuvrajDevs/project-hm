// Pure primitives for the email-verified chat-key reset code: no Firebase, no network, so these
// can be unit-tested directly. lib/firebaseAdmin.ts and app/api/chat/reset/route.ts hold the
// server orchestration (verify the caller, store the hash, send the email) that calls these.
import { randomInt, createHash } from "node:crypto";

export const RESET_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const RESET_CODE_MAX_ATTEMPTS = 5;

export const makeResetCode = (): string => String(randomInt(0, 1_000_000)).padStart(6, "0");

// Salted with the uid: the hash stored for one person's attempt can never be replayed against
// another's, and two people independently landing on the same 6-digit code never collide.
export const hashResetCode = (code: string, uid: string): string =>
  createHash("sha256").update(`${uid}:${code}`).digest("hex");

export const isResetCodeExpired = (expiresAt: number): boolean => Date.now() > expiresAt;
