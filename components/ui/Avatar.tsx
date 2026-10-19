import React from "react";
import { Cat, Ghost, Smile } from "lucide-react";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

const SIZES = {
  xs: { box: "w-6 h-6 rounded-full", icon: "w-3.5 h-3.5" },
  sm: { box: "w-10 h-10 rounded-2xl", icon: "w-5 h-5" },
  md: { box: "w-14 h-14 rounded-[1.4rem]", icon: "w-7 h-7" },
  lg: { box: "w-28 h-28 rounded-[2.4rem]", icon: "w-14 h-14" },
} as const;

// The avatar is chosen from three characters; the choice is stored as `gender` on the profile
const LOOKS = {
  Male: { Icon: Cat, tile: "from-blue-400/30 to-blue-400/5", color: "text-blue-300" },
  Female: { Icon: Smile, tile: "from-pink-400/30 to-pink-400/5", color: "text-pink-300" },
  other: { Icon: Ghost, tile: "from-white/15 to-white/[0.03]", color: "text-neutral-300" },
} as const;

export const Avatar = ({ user, size = "md", className }: { user: Pick<User, "gender" | "displayName"> & { avatarImage?: string } | null; size?: keyof typeof SIZES; className?: string }) => {
  const look = user?.gender === "Male" ? LOOKS.Male : user?.gender === "Female" ? LOOKS.Female : LOOKS.other;
  const s = SIZES[size];
  const photo = user?.avatarImage?.startsWith("data:image/") ? user.avatarImage : null;
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt={user?.displayName ? `${user.displayName}'s picture` : "Picture"}
        draggable={false}
        className={cn("shrink-0 object-cover border border-white/10", s.box, className)}
      />
    );
  }
  return (
    <div
      role="img"
      aria-label={user?.displayName ? `${user.displayName}'s avatar` : "Avatar"}
      className={cn("shrink-0 flex items-center justify-center border border-white/10 bg-gradient-to-br", look.tile, s.box, className)}
    >
      <look.Icon className={cn(s.icon, look.color)} strokeWidth={1.75} />
    </div>
  );
};
