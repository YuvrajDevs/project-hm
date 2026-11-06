// Polyfills first: the shared encryption code needs WebCrypto before any module that uses it is loaded.
import "./src/native/polyfills";
import { Platform } from "react-native";
import { registerWidgetTaskHandler } from "react-native-android-widget";
import { widgetTaskHandler } from "./src/widget/taskHandler";
import "expo-router/entry";

if (Platform.OS === "android") registerWidgetTaskHandler(widgetTaskHandler);
