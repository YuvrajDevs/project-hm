"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const AmbientBackground = ({ variant = "standard" }: { variant?: "standard" | "bright" }) => {
    const isBright = variant === "bright";

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-[#070707]">
            {/* Bright Soft Pink Wash (Pinned Top Left) */}
            <motion.div
                animate={{
                    scale: [1, 1.1, 1],
                    x: ["-20%", "-10%", "-20%"],
                    y: ["-20%", "-10%", "-20%"],
                }}
                transition={{
                    duration: 35,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className={cn(
                    "absolute -top-1/4 -left-1/4 w-[110%] h-[110%] bg-[radial-gradient(circle_at_center,_#ff69b4_0%,_transparent_55%)] blur-[160px] transition-opacity duration-1000",
                    isBright ? "opacity-[0.4]" : "opacity-[0.2]"
                )}
            />
            
            {/* Bright Soft Sky Blue Wash (Pinned Bottom Right) */}
            <motion.div
                animate={{
                    scale: [1.2, 1, 1.2],
                    x: ["20%", "10%", "20%"],
                    y: ["20%", "10%", "20%"],
                }}
                transition={{
                    duration: 40,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className={cn(
                    "absolute -bottom-1/4 -right-1/4 w-[110%] h-[110%] bg-[radial-gradient(circle_at_center,_#87ceeb_0%,_transparent_55%)] blur-[160px] transition-opacity duration-1000",
                    isBright ? "opacity-[0.35]" : "opacity-[0.18]"
                )}
            />

            {/* Static Subtle Noise for texture without flickering */}
            <div 
                className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] brightness-200 contrast-125 mix-blend-overlay pointer-events-none"
            />
        </div>
    );
};
