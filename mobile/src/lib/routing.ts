// Which top-level screen the session belongs on. The gate (src/app/index.tsx) sends people there on launch, and
// every screen calls useGuard so that signing out, being unpaired or a partner leaving moves them on at once.
import { useEffect } from "react";
import { router } from "expo-router";
import { useSession } from "~/store/session";
import { isOwnerEmail } from "@/lib/adminMetrics";

export type Place = "/sign-in" | "/owner" | "/onboarding" | "/single" | "/home";

type S = ReturnType<typeof useSession.getState>;

export const placeFor = (s: S): Place | null => {
  if (s.auth === "loading") return null;
  if (s.auth === "signedOut") return "/sign-in";
  // The owner account is only for the website's dashboard and never gets a couple profile
  if (isOwnerEmail(s.authUser?.email)) return "/owner";
  if (!s.user) return null; // profile still loading (or being created)
  if (!s.user.hasCompletedOnboarding) return "/onboarding";
  // Not paired (never, or a partner left): the single hub, which also shows the "partner left" news
  if (!s.user.coupleId) return "/single";
  return "/home";
};

/** Keep this screen only while the session belongs on one of `allowed`; otherwise move on. */
export const useGuard = (allowed: Place[]) => {
  const place = useSession(placeFor);
  useEffect(() => {
    if (place && !allowed.includes(place)) router.replace(place);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place]);
  return place !== null && allowed.includes(place);
};
