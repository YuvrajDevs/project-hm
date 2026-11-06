"use no memo";
// Widgets are drawn outside React (plain function calls), so React Compiler's caching hook would crash them with
// "Invalid Hook Call": this file is opted out.
//
// "Streak": the check-in streak, big, on the same yellow as the app's streak card, with today's two check-ins.
import { FlexWidget, SvgWidget, TextWidget } from "react-native-android-widget";
import type { WidgetSnapshot } from "./snapshot";
import { addDays } from "@/lib/dates";
import { BEBAS, BODY, ICON, RADIUS, firstName } from "./parts";

const INK = "#17140a";
const SOFT = "#17140a1f";

const Dot = ({ on }: { on: boolean }) => (
  <FlexWidget style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: on ? INK : SOFT, marginRight: 4 }} />
);

export function StreakWidget({ data }: { data: WidgetSnapshot | null }) {
  const paired = !!data?.paired;
  // A streak is only alive if its last counted day is today or yesterday
  const live = !!data && data.streak > 0 && (data.streakDay === data.todayId || data.streakDay === addDays(data.todayId, -1));
  const n = live ? data!.streak : 0;
  const name = firstName(data?.partnerName ?? "");
  const line = !paired
    ? "Open the app to start"
    : data!.mine && data!.theirs ? "Both checked in today"
    : data!.mine ? `Waiting on ${name}`
    : data!.theirs ? `${name} checked in · your turn`
    : "Check in today";

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ height: "match_parent", width: "match_parent", borderRadius: RADIUS, padding: 16, flexDirection: "column", justifyContent: "space-between", backgroundGradient: { from: "#ffd91a", to: "#ffc400", orientation: "TL_BR" } }}
    >
      <FlexWidget style={{ width: "match_parent", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <TextWidget text="CHECK-IN STREAK" style={{ fontFamily: BEBAS, fontSize: 12, color: INK, letterSpacing: 0.2 }} />
        <FlexWidget style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: SOFT, justifyContent: "center", alignItems: "center" }}>
          <SvgWidget svg={ICON.heart(live ? "#c81e1e" : "#17140a66")} style={{ width: 15, height: 15 }} />
        </FlexWidget>
      </FlexWidget>

      <FlexWidget style={{ flexDirection: "row", alignItems: "flex-end" }}>
        <TextWidget text={String(n)} style={{ fontFamily: BEBAS, fontSize: n > 99 ? 58 : 72, color: INK }} />
        <TextWidget text={n === 1 ? " DAY" : " DAYS"} style={{ fontFamily: BEBAS, fontSize: 20, color: INK, marginBottom: 10 }} />
      </FlexWidget>

      <FlexWidget style={{ flexDirection: "row", alignItems: "center" }}>
        <Dot on={!!data?.mine} />
        <Dot on={!!data?.theirs} />
        <TextWidget text={line} maxLines={1} truncate="END" style={{ fontFamily: BODY, fontSize: 11, color: INK, marginLeft: 4 }} />
      </FlexWidget>
    </FlexWidget>
  );
}
