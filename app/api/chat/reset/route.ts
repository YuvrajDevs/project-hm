// Email-verified gate for a forgotten-passphrase chat key reset. The client calls this to request
// and then verify a 6-digit code before it is allowed to call resetChatKey() (lib/firestore-helpers.ts),
// which destroys the old key and purges this person's own chat history. The code itself is generated
// and checked here, never on the client, and only ever sent to the email on the caller's own Firebase
// account (from the verified ID token) - never to an address the client supplies.
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import {
  makeResetCode, hashResetCode, isResetCodeExpired, RESET_CODE_TTL_MS, RESET_CODE_MAX_ATTEMPTS,
  makeResetTicket, hashResetTicket, RESET_TICKET_TTL_MS,
} from "@/lib/resetCode";
import { sendResetCode } from "@/lib/mailer";

// A well-formed EC P-256 public JWK, same shape as e2eeCrypto.ts's publicFromPrivateJwk - the only
// shape this route will ever publish to someone's chatPublicKey.
const isPublicJwk = (v: unknown): v is JsonWebKey => {
  const k = v as Record<string, unknown> | null;
  return !!k && k.kty === "EC" && k.crv === "P-256" && typeof k.x === "string" && typeof k.y === "string";
};

const authenticate = async (req: NextRequest) => {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  try {
    return await adminAuth().verifyIdToken(token);
  } catch {
    return null;
  }
};

export async function POST(req: NextRequest) {
  const decoded = await authenticate(req);
  if (!decoded || !decoded.email) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as
    | { action?: string; code?: string; ticket?: string; publicKey?: unknown }
    | null;
  const ref = adminDb().collection("chatResetCodes").doc(decoded.uid);

  if (body?.action === "request") {
    const existing = await ref.get();
    const existingData = existing.data();
    // A fresh code is already live - resend nothing, don't reset its expiry or attempt count.
    // (A verified-but-not-yet-finalized ticket has no codeHash, so it never blocks a fresh request.)
    if (existing.exists && existingData?.codeHash && !isResetCodeExpired(existingData.expiresAt)) {
      return NextResponse.json({ ok: true });
    }
    const code = makeResetCode();
    await ref.set({
      codeHash: hashResetCode(code, decoded.uid),
      expiresAt: Date.now() + RESET_CODE_TTL_MS,
      attempts: 0,
    });
    await sendResetCode(decoded.email, code);
    return NextResponse.json({ ok: true });
  }

  if (body?.action === "verify" && typeof body.code === "string") {
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Request a code first." }, { status: 400 });
    const data = snap.data()!;
    if (isResetCodeExpired(data.expiresAt)) {
      await ref.delete();
      return NextResponse.json({ error: "That code expired. Request a new one." }, { status: 400 });
    }
    if (data.attempts >= RESET_CODE_MAX_ATTEMPTS) {
      await ref.delete();
      return NextResponse.json({ error: "Too many wrong attempts. Request a new code." }, { status: 429 });
    }
    if (hashResetCode(body.code, decoded.uid) !== data.codeHash) {
      await ref.update({ attempts: data.attempts + 1 });
      return NextResponse.json({ error: "That code isn't right." }, { status: 400 });
    }
    // Code verified. Replace it with a short-lived single-use ticket: the actual key-wipe
    // ("finalize") is a separate call so nothing can trigger it without this verified ticket.
    const ticket = makeResetTicket();
    await ref.set({
      ticketHash: hashResetTicket(ticket, decoded.uid),
      ticketExpiresAt: Date.now() + RESET_TICKET_TTL_MS,
    });
    return NextResponse.json({ ok: true, ticket });
  }

  // Finalizes a forgotten-passphrase reset: the client has already generated its replacement
  // keypair locally (the private half never leaves the device) and presents the new public key
  // plus the ticket minted on verify. Only on a matching, unexpired ticket does the Admin SDK
  // publish that key and drop the old backup - this is the one place that destruction actually
  // happens, so it can never run without a code the caller proved they received by email.
  if (body?.action === "finalize" && typeof body.ticket === "string" && isPublicJwk(body.publicKey)) {
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Verify your code first." }, { status: 400 });
    const data = snap.data()!;
    if (!data.ticketHash || isResetCodeExpired(data.ticketExpiresAt)) {
      await ref.delete();
      return NextResponse.json({ error: "That verification expired. Start over." }, { status: 400 });
    }
    if (hashResetTicket(body.ticket, decoded.uid) !== data.ticketHash) {
      return NextResponse.json({ error: "Invalid ticket." }, { status: 400 });
    }
    await adminDb().doc(`users/${decoded.uid}`).update({ chatPublicKey: body.publicKey });
    await adminDb().doc(`users/${decoded.uid}/keys/chat`).delete();
    await ref.delete();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
