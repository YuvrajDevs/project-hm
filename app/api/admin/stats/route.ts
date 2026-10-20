// The owner dashboard's data. Only the emails listed in ADMIN_EMAILS (server env, comma-separated) get
// through: the caller's Firebase ID token is verified here, and its email must be verified and on the list.
// The response is counts, names, emails and timestamps only - never anyone's messages.
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { collectAdminStats, type AdminStats } from "@/lib/adminData";
import { OWNER_EMAIL, isAdminEmail, parseAdminEmails } from "@/lib/adminMetrics";

export const dynamic = "force-dynamic";

// Used when ADMIN_EMAILS isn't set; set ADMIN_EMAILS (comma-separated) to add people or replace this.
const DEFAULT_ADMIN_EMAILS = OWNER_EMAIL;

// Counting every couple's activity is many reads, so a recent result is reused for a few minutes
const CACHE_MS = 5 * 60_000;
let cache: { at: number; stats: AdminStats } | null = null;

export async function GET(req: NextRequest) {
  const allowed = parseAdminEmails(process.env.ADMIN_EMAILS ?? DEFAULT_ADMIN_EMAILS);
  if (allowed.length === 0) {
    return NextResponse.json({ error: "ADMIN_EMAILS is not set on the server." }, { status: 503 });
  }
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  if (!isAdminEmail(decoded.email, decoded.email_verified, allowed)) {
    return NextResponse.json({ error: "This account isn't allowed here." }, { status: 403 });
  }

  const fresh = req.nextUrl.searchParams.get("fresh") === "1";
  if (!fresh && cache && Date.now() - cache.at < CACHE_MS) {
    return NextResponse.json(cache.stats, { headers: { "Cache-Control": "no-store" } });
  }
  try {
    const stats = await collectAdminStats();
    cache = { at: Date.now(), stats };
    return NextResponse.json(stats, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("admin stats failed", err);
    return NextResponse.json({ error: "Couldn't load the numbers." }, { status: 500 });
  }
}
