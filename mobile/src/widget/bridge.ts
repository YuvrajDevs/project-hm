// App → widget. Called by the sync engine only when something the widget shows actually changed, and then at most
// once every few seconds, so a busy evening of messages never turns into a stream of widget redraws.
import { Platform } from "react-native";
import React from "react";
import { requestWidgetUpdate } from "react-native-android-widget";
import { UsWidget } from "./UsWidget";
import { saveSnapshot, type WidgetSnapshot } from "./snapshot";

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
  requestWidgetUpdate({
    widgetName: "Us",
    renderWidget: () => React.createElement(UsWidget, { data: snap }),
  }).catch(() => { /* no widget placed: nothing to draw */ });
};

export const refreshWidget = (snap: WidgetSnapshot | null) => {
  if (Platform.OS !== "android") return;
  pending = snap;
  if (!timer) timer = setTimeout(flush, 1500);
};
