// A person's picture, or one of three characters (components/ui/Avatar.tsx). The character is stored as `gender`.
import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Cat, Ghost, Smile } from "lucide-react-native";
import type { User } from "@/lib/types";
import { C, W } from "~/theme/tokens";

const SIZES = { xs: { box: 24, r: 12, icon: 14 }, sm: { box: 40, r: 16, icon: 20 }, md: { box: 56, r: 22, icon: 28 }, lg: { box: 112, r: 38, icon: 56 } } as const;

const LOOKS = {
  Male: { Icon: Cat, colors: ["rgba(96,165,250,0.3)", "rgba(96,165,250,0.05)"] as [string, string], color: C.blue300 },
  Female: { Icon: Smile, colors: ["rgba(244,114,182,0.3)", "rgba(244,114,182,0.05)"] as [string, string], color: C.pink300 },
  other: { Icon: Ghost, colors: [W(0.15), W(0.03)] as [string, string], color: C.neutral300 },
};

export const Avatar = memo(function Avatar({ user, size = "md" }: { user: (Pick<User, "gender" | "displayName"> & { avatarImage?: string }) | null; size?: keyof typeof SIZES }) {
  const s = SIZES[size];
  const photo = user?.avatarImage?.startsWith("data:image/") ? user.avatarImage : null;
  const label = user?.displayName ? `${user.displayName}'s picture` : "Picture";
  if (photo) {
    return <Image source={{ uri: photo }} style={[styles.base, { width: s.box, height: s.box, borderRadius: s.r }]} contentFit="cover" accessibilityLabel={label} />;
  }
  const look = user?.gender === "Male" ? LOOKS.Male : user?.gender === "Female" ? LOOKS.Female : LOOKS.other;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}>
      <LinearGradient colors={look.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.base, styles.center, { width: s.box, height: s.box, borderRadius: s.r }]}>
        <look.Icon size={s.icon} color={look.color} strokeWidth={1.75} />
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  base: { borderWidth: 1, borderColor: W(0.1) },
  center: { alignItems: "center", justifyContent: "center" },
});
