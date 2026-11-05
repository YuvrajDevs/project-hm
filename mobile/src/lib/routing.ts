// Which top-level screen the session belongs on. The gate (src/app/index.tsx) sends people there on launch, and
// every screen calls useGuard so that signing out, being unpaired or a partner leaving moves them on at once.
import { useEffect } from "react";
import { router } from "expo-router";
import { useSession } from "~/store/session";

export type Place = "/sign-in" | "/onboarding" | "/pair" | "/home";

type S = ReturnType<typeof useSession.getState>;

export const placeFor = (s: S): Place | null => {
  if (s.auth === "loading") return null;
  if (s.auth === "signedOut") return "/sign-in";
  if (!s.user) return null; // profile still loading (or being created)
  if (!s.user.hasCompletedOnboarding) return "/onboarding";
  // A partner who left: the home screen shows them the news first, then sends them on to pair again
  if (!s.user.coupleId && !s.user.leftByPartner) return "/pair";
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
