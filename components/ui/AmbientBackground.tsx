"use client";

import React from "react";
import { motion } from "framer-motion";
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
            {/* Top Left Wash */}
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
                    "absolute -top-1/4 -left-1/4 w-[110%] h-[110%] transition-all duration-1000 will-change-transform transform-gpu",
                    isBright ? "opacity-[0.4]" : "opacity-[0.2]"
                )}
                style={{ backgroundImage: `radial-gradient(circle at center, ${color1} 0%, transparent 55%)` }}
            />
            
            {/* Bottom Right Wash */}
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
                    "absolute -bottom-1/4 -right-1/4 w-[110%] h-[110%] transition-all duration-1000 will-change-transform transform-gpu",
                    isBright ? "opacity-[0.35]" : "opacity-[0.18]"
                )}
                style={{ backgroundImage: `radial-gradient(circle at center, ${color2} 0%, transparent 55%)` }}
            />

            {/* Static Subtle Noise for texture without flickering */}
            <div 
                className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] brightness-200 contrast-125 mix-blend-overlay pointer-events-none"
            />
        </div>
    );
};
