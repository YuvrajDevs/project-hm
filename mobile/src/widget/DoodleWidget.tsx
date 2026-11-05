"use no memo";
// Widgets are drawn outside React (plain function calls), so React Compiler's caching hook would crash them with
// "Invalid Hook Call": this file is opted out.
//
// "Doodle": the last drawing your partner sent, on cream paper. Tapping it opens the pad to draw one back.
import { FlexWidget, OverlapWidget, SvgWidget, TextWidget } from "react-native-android-widget";
import type { SharedWidgets } from "./shared";
import { PAPER } from "./shared";
import { BEBAS, BODY, Chip, ICON, INK, RADIUS, RoundButton, SERIF, firstName, stamp } from "./parts";

const URI = "honestmailbox://doodle";

export function DoodleWidget({ data }: { data: SharedWidgets | null }) {
  const name = firstName(data?.partnerName ?? "");
  const doodle = data?.doodle ?? null;
  return (
    <OverlapWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: URI }}
      style={{ height: "match_parent", width: "match_parent", backgroundColor: PAPER, borderRadius: RADIUS }}
    >
      {doodle ? (
        <SvgWidget svg={doodle.svg} style={{ height: "match_parent", width: "match_parent" }} />
      ) : (
        <FlexWidget style={{ height: "match_parent", width: "match_parent", justifyContent: "center", alignItems: "center", padding: 16 }}>
          <FlexWidget style={{ flexDirection: "row", alignItems: "center" }}>
            <TextWidget text="A " style={{ fontFamily: BEBAS, fontSize: 26, color: INK }} />
            <TextWidget text="doodle" style={{ fontFamily: SERIF, fontSize: 25, color: INK }} />
          </FlexWidget>
          <TextWidget text={data ? `for ${name} lands here` : "Open the app to sign in"} style={{ fontFamily: BODY, fontSize: 12, color: "#6b6459", marginTop: 2 }} />
        </FlexWidget>
      )}

      {/* Corners: who it's from at the top, the pencil to draw back at the bottom */}
      <FlexWidget style={{ height: "match_parent", width: "match_parent", padding: 12, flexDirection: "column", justifyContent: "space-between" }}>
        <FlexWidget style={{ width: "match_parent", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          {doodle ? <Chip text={`From ${name}`} bg={INK} color="#ffffff" /> : <FlexWidget style={{ width: 1, height: 1 }} />}
          {doodle ? <TextWidget text={stamp(doodle.at)} style={{ fontFamily: BODY, fontSize: 11, color: "#8a8174" }} /> : <FlexWidget style={{ width: 1, height: 1 }} />}
        </FlexWidget>
        <FlexWidget style={{ width: "match_parent", flexDirection: "row", justifyContent: "flex-end" }}>
          <RoundButton icon={ICON.pencil("#ffffff")} bg={INK} uri={URI} />
        </FlexWidget>
      </FlexWidget>
    </OverlapWidget>
  );
}
