// Who is signed in, their profile, their couple and their partner. Written only by the sync layer
// (src/data/sync.ts); screens read single fields with selectors so they re-render only when that field changes.
import { create } from "zustand";
import type { Couple, User } from "@/lib/types";

export type AuthStatus = "loading" | "signedOut" | "signedIn";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface SessionState {
  auth: AuthStatus;
  authUser: AuthUser | null;
  /** Profile document; null while loading or for a brand-new account whose profile is being created */
  user: User | null;
  couple: Couple | null;
  partner: User | null;
}

export const useSession = create<SessionState>(() => ({
  auth: "loading",
  authUser: null,
  user: null,
  couple: null,
  partner: null,
}));

export const resetSession = (auth: AuthStatus) =>
  useSession.setState({ auth, authUser: null, user: null, couple: null, partner: null });

// ─── Small selectors used all over the app ───────────────────────────────────
export const selectUid = (s: SessionState) => s.authUser?.uid ?? null;
export const selectCoupleId = (s: SessionState) => s.user?.coupleId ?? null;
export const selectPartnerUid = (s: SessionState) => s.partner?.uid ?? null;
