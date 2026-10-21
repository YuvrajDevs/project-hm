// Pure primitives for the email-verified chat-key reset code: no Firebase, no network, so these
// can be unit-tested directly. lib/firebaseAdmin.ts and app/api/chat/reset/route.ts hold the
// server orchestration (verify the caller, store the hash, send the email) that calls these.
import { randomInt, randomBytes, createHash } from "node:crypto";

export const RESET_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const RESET_CODE_MAX_ATTEMPTS = 5;

export const makeResetCode = (): string => String(randomInt(0, 1_000_000)).padStart(6, "0");

// Salted with the uid: the hash stored for one person's attempt can never be replayed against
// another's, and two people independently landing on the same 6-digit code never collide.
export const hashResetCode = (code: string, uid: string): string =>
  createHash("sha256").update(`${uid}:${code}`).digest("hex");

export const isResetCodeExpired = (expiresAt: number): boolean => Date.now() > expiresAt;

// A one-time ticket minted after the emailed code is verified, so the destructive key-wipe
// (app/api/chat/reset/route.ts, action "finalize") can only run once per verified code, and only
// through the server - never as an unconditional client write. See RESET_TICKET_TTL_MS below for
// how long a verified code has to be spent before it must be requested again.
export const RESET_TICKET_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const makeResetTicket = (): string => randomBytes(32).toString("hex");

export const hashResetTicket = (ticket: string, uid: string): string =>
  createHash("sha256").update(`ticket:${uid}:${ticket}`).digest("hex");
