"use no memo";
// Widgets are drawn outside React (plain function calls), so React Compiler's caching hook would crash them with
// "Invalid Hook Call": this file is opted out.
//
// "Live pic": the last photo your partner sent, edge to edge. Tapping it opens the camera to send one back.
import { FlexWidget, ImageWidget, OverlapWidget, SvgWidget, TextWidget } from "react-native-android-widget";
import type { SharedWidgets } from "./shared";
import { BEBAS, BODY, ICON, RADIUS, RoundButton, SERIF, firstName, stamp } from "./parts";

const URI = "honestmailbox://snap";
/** The picture is decoded at this size; widgets have a memory budget, and the square is never shown larger */
const PX = 360;

export function LivePicWidget({ data }: { data: SharedWidgets | null }) {
  const name = firstName(data?.partnerName ?? "");
  const pic = data?.pic ?? null;

  if (!pic) {
    return (
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: URI }}
        style={{ height: "match_parent", width: "match_parent", borderRadius: RADIUS, padding: 16, justifyContent: "center", alignItems: "center", backgroundGradient: { from: "#d6336c", to: "#b92558", orientation: "TL_BR" } }}
      >
        <FlexWidget style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "#ffffff33", justifyContent: "center", alignItems: "center" }}>
          <SvgWidget svg={ICON.camera("#ffffff")} style={{ width: 24, height: 24 }} />
        </FlexWidget>
        <FlexWidget style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
          <TextWidget text="LIVE " style={{ fontFamily: BEBAS, fontSize: 24, color: "#ffffff" }} />
          <TextWidget text="pic" style={{ fontFamily: SERIF, fontSize: 23, color: "#ffffff" }} />
        </FlexWidget>
        <TextWidget text={data ? `${name}'s photos land here` : "Open the app to sign in"} style={{ fontFamily: BODY, fontSize: 12, color: "#ffe4ee", marginTop: 2 }} />
      </FlexWidget>
    );
  }

  return (
    <OverlapWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: URI }}
      style={{ height: "match_parent", width: "match_parent", borderRadius: RADIUS, backgroundColor: "#111111" }}
    >
      <ImageWidget image={`data:image/jpeg;base64,${pic.data}`} imageWidth={PX} imageHeight={PX} radius={RADIUS} resizeMode="cover" style={{ height: "match_parent", width: "match_parent" }} />
      {/* A soft dark fade at the bottom so the name always reads, whatever the photo */}
      <FlexWidget style={{ height: "match_parent", width: "match_parent", flexDirection: "column", justifyContent: "flex-end" }}>
        <FlexWidget style={{ width: "match_parent", height: 110, backgroundGradient: { from: "rgba(0, 0, 0, 0)", to: "rgba(0, 0, 0, 0.6)", orientation: "TOP_BOTTOM" } }} />
      </FlexWidget>
      <FlexWidget style={{ height: "match_parent", width: "match_parent", padding: 12, flexDirection: "column", justifyContent: "space-between" }}>
        <FlexWidget style={{ width: "match_parent", flexDirection: "row", justifyContent: "flex-end" }}>
          <RoundButton icon={ICON.camera("#ffffff")} bg="#00000066" uri={URI} size={36} />
        </FlexWidget>
        <FlexWidget style={{ flexDirection: "column" }}>
          <TextWidget text={name.toUpperCase()} maxLines={1} truncate="END" style={{ fontFamily: BEBAS, fontSize: 18, color: "#ffffff", letterSpacing: 0.08 }} />
          <TextWidget text={stamp(pic.at)} style={{ fontFamily: BODY, fontSize: 11, color: "#ffffffcc" }} />
        </FlexWidget>
      </FlexWidget>
    </OverlapWidget>
  );
}
