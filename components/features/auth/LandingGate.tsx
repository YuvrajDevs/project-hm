"use client";

import React from "react";
import { useMailbox } from "@/context/MailboxContext";

// The landing page is rendered on the server so search engines and signed-out visitors get real content.
// Once someone is signed in it is removed from the page completely, so no app screen ever sits on top of
// a hidden landing page (extra weight, and a second page that can scroll behind the screen).
export const LandingGate = ({ children }: { children: React.ReactNode }) => {
  const { fbUser } = useMailbox();
  if (fbUser && fbUser !== "loading") return null;
  return <>{children}</>;
};
