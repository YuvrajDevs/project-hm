"use client";

import React from "react";
import { cn } from "@/lib/utils";

export const AmbientBackground = ({ variant = "standard", gender }: { variant?: "standard" | "bright", gender?: string }) => {
    const isBright = variant === "bright";

    // Dynamic colors based on gender
    let color1 = "#ff69b4"; // default pink
    let color2 = "#87ceeb"; // default sky blue
    
    if (gender === "Male") {
        color1 = "#4f46e5"; // deep indigo
        color2 = "#3b82f6"; // bright blue
    } else if (gender === "Female") {
        color1 = "#ff69b4"; // soft pink
        color2 = "#ec4899"; // rose
    }

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-[#070707]">
            {/* Two slow colour washes. Transform-only CSS animations, so they run off the main thread. */}
            <div
                className={cn(
                    "ambient-wash ambient-wash-a absolute -top-1/4 -left-1/4 w-[110%] h-[110%]",
                    isBright ? "opacity-[0.4]" : "opacity-[0.2]"
                )}
                style={{ backgroundImage: `radial-gradient(circle at center, ${color1} 0%, transparent 55%)` }}
            />
            <div
                className={cn(
                    "ambient-wash ambient-wash-b absolute -bottom-1/4 -right-1/4 w-[110%] h-[110%]",
                    isBright ? "opacity-[0.35]" : "opacity-[0.18]"
                )}
                style={{ backgroundImage: `radial-gradient(circle at center, ${color2} 0%, transparent 55%)` }}
            />

            {/* Static grain. A plain overlay: blend modes and filters over the full screen are expensive on phones. */}
            <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.05] pointer-events-none" />
        </div>
    );
};
