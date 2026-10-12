"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMailbox } from "@/context/MailboxContext";

/**
 * Sends signed-out visitors (or an expired session) back to the landing page
 * instead of leaving them on a blank screen.
 */
export const useAuthGuard = () => {
  const { fbUser } = useMailbox();
  const router = useRouter();

  useEffect(() => {
    if (fbUser === null) router.replace("/");
  }, [fbUser, router]);

  return { isSignedIn: fbUser !== null && fbUser !== "loading" };
};
