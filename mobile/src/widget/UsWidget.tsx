"use no memo";
// Widgets are drawn outside React (plain function calls), so React Compiler's caching hook would crash them with
// "Invalid Hook Call": this file is opted out.
// The "Us" home-screen widget. Android draws it from native RemoteViews, so it costs nothing while it sits on the
// home screen; this JSX only describes it. It never shows anything written (notes, chat): only the partner's mood
// word, whether each of you has checked in today, the streak, and how many notes are waiting.
import { FlexWidget, ImageWidget, TextWidget } from "react-native-android-widget";
import type { WidgetSnapshot } from "./snapshot";
import { addDays } from "@/lib/dates";

const BG = "#161616";
const BORDER = "#2a2a2a";
const MUTED = "#8a8a8a";
const PINK = "#f472b6";
const BLUE = "#60a5fa";
const YELLOW = "#facc15";
const BEBAS = "BebasNeue_400Regular";
const BODY = "Outfit_400Regular";

const Dot = ({ on, color }: { on: boolean; color: `#${string}` }) => (
  <FlexWidget style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: on ? color : "#333333" }} />
);

export function UsWidget({ data }: { data: WidgetSnapshot | null }) {
  if (!data || !data.paired) {
    return (
      <FlexWidget clickAction="OPEN_APP" style={{ height: "match_parent", width: "match_parent", backgroundColor: BG, borderRadius: 24, borderWidth: 1, borderColor: BORDER, padding: 16, justifyContent: "center", alignItems: "center" }}>
        {/* The wordmark, as in the app: THE Honest MAILBOX */}
        <ImageWidget image={require("../../assets/widget/wordmark-white.png")} imageWidth={151} imageHeight={17} />
        <TextWidget text={data ? "Pair with your partner to see them here" : "Open the app to sign in"} style={{ fontFamily: BODY, fontSize: 12, color: MUTED, marginTop: 4 }} />
      </FlexWidget>
    );
  }
  const name = data.partnerName || "Partner";
  // A streak is only alive if its last counted day is today or yesterday; otherwise it has broken
  const streakLive = data.streak > 0 && (data.streakDay === data.todayId || data.streakDay === addDays(data.todayId, -1));
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ height: "match_parent", width: "match_parent", backgroundColor: BG, borderRadius: 24, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 18, paddingVertical: 14, flexDirection: "column", justifyContent: "space-between" }}
    >
      <FlexWidget style={{ width: "match_parent", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <TextWidget text={name.toUpperCase()} maxLines={1} truncate="END" style={{ fontFamily: BEBAS, fontSize: 18, color: BLUE, letterSpacing: 0.12 }} />
        <TextWidget text={streakLive ? `${data.streak} DAY STREAK` : "START A STREAK"} style={{ fontFamily: BEBAS, fontSize: 14, color: YELLOW, letterSpacing: 0.1 }} />
      </FlexWidget>

      <TextWidget
        text={data.partnerMood ? `Feeling ${data.partnerMood.toLowerCase()}` : "Hasn't shared a mood yet"}
        maxLines={1}
        truncate="END"
        style={{ fontFamily: BODY, fontSize: 16, color: "#ffffff" }}
      />

      <FlexWidget style={{ width: "match_parent", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <FlexWidget style={{ flexDirection: "row", alignItems: "center", flexGap: 6 }}>
          <Dot on={data.mine} color={PINK} />
          <Dot on={data.theirs} color={BLUE} />
          <TextWidget
            text={data.mine && data.theirs ? "Both checked in" : data.mine ? `Waiting on ${name}` : "Check in today"}
            style={{ fontFamily: BODY, fontSize: 12, color: MUTED, marginLeft: 4 }}
          />
        </FlexWidget>
        {data.waiting > 0 ? (
          <TextWidget text={`${data.waiting} NOTE${data.waiting === 1 ? "" : "S"} WAITING`} style={{ fontFamily: BEBAS, fontSize: 13, color: PINK, letterSpacing: 0.1 }} />
        ) : <FlexWidget />}
      </FlexWidget>
    </FlexWidget>
  );
}
