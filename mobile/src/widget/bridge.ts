// App → widgets. Called by the sync engine only when something a widget shows actually changed, and then at most
// once every few seconds, so a busy evening never turns into a stream of widget redraws.
import { Platform } from "react-native";
import React from "react";
import { requestWidgetUpdate } from "react-native-android-widget";
import { UsWidget } from "./UsWidget";
import { StreakWidget } from "./StreakWidget";
import { DoodleWidget } from "./DoodleWidget";
import { LivePicWidget } from "./LivePicWidget";
import { saveSnapshot, type WidgetSnapshot } from "./snapshot";
import { saveShared, type SharedWidgets } from "./shared";

/** Redraws a widget if one is placed; no widget placed means nothing to draw */
export const draw = (widgetName: string, el: React.ReactElement) =>
  requestWidgetUpdate({ widgetName, renderWidget: () => el }).catch(() => {});

let last = "";
let timer: ReturnType<typeof setTimeout> | null = null;
let pending: WidgetSnapshot | null = null;

const flush = () => {
  timer = null;
  const snap = pending;
  const key = JSON.stringify(snap);
  if (key === last) return;
  last = key;
  saveSnapshot(snap);
  draw("Us", React.createElement(UsWidget, { data: snap }));
  draw("Streak", React.createElement(StreakWidget, { data: snap }));
};

export const refreshWidget = (snap: WidgetSnapshot | null) => {
  if (Platform.OS !== "android") return;
  pending = snap;
  if (!timer) timer = setTimeout(flush, 1500);
};

let lastShared = "";

/** The partner's doodle and live picture changed (or who the partner is): save them and redraw those widgets */
export const refreshSharedWidgets = (shared: SharedWidgets | null) => {
  if (Platform.OS !== "android") return;
  const key = JSON.stringify(shared);
  if (key === lastShared) return;
  lastShared = key;
  saveShared(shared);
  draw("Doodle", React.createElement(DoodleWidget, { data: shared }));
  draw("LivePic", React.createElement(LivePicWidget, { data: shared }));
};
