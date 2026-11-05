// An invite code opened before signing in (honestmailbox://pair?code=… or the https link), kept until the
// account exists so pairing can finish right after sign-up. Same idea as PENDING_INVITE_KEY on the web.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PENDING_INVITE_KEY } from "@/lib/constants";

export const cleanCode = (raw: unknown) =>
  (typeof raw === "string" ? raw : "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);

export const savePendingInvite = (code: string) => AsyncStorage.setItem(PENDING_INVITE_KEY, code).catch(() => {});
export const takePendingInvite = async () => {
  try {
    const code = await AsyncStorage.getItem(PENDING_INVITE_KEY);
    return code ? cleanCode(code) : "";
  } catch {
    return "";
  }
};
export const clearPendingInvite = () => AsyncStorage.removeItem(PENDING_INVITE_KEY).catch(() => {});
