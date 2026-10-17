"use client";

import React from "react";

// The page background: one flat colour, nothing moving behind the content.
// (The props are kept so every screen that passes them keeps working.)
export const AmbientBackground = (_props: { variant?: "standard" | "bright"; gender?: string }) => (
    <div className="fixed inset-0 pointer-events-none z-0 bg-[#0e0e0e]" aria-hidden="true" />
);
