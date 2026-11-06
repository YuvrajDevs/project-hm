// The app's version of lib/chatMedia.ts: picks photos and videos with the system picker and squeezes them to the same
// sizes and limits the website uses, so a photo sent from the app and one sent from the web are the same kind of
// payload. Resizing and JPEG encoding happen natively (expo-image-manipulator), off the JS thread, and re-encoding
// drops the location and camera details a photo carries.
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as VideoThumbnails from "expo-video-thumbnails";
import { File } from "expo-file-system";
import { ChatMediaError, MAX_DATA_CHARS, MAX_PROOF_CHARS, MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS, type PreparedImage, type PreparedVideo } from "@/lib/chatMedia";

export { ChatMediaError };

type Asset = ImagePicker.ImagePickerAsset;

/** Opens the photo library (or camera). Resolves to null if the person closed it. */
export async function pickImage(source: "library" | "camera" = "library"): Promise<Asset | null> {
  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new ChatMediaError("Camera access is off. Turn it on in Settings to take a photo.");
  }
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1, exif: false, allowsMultipleSelection: false };
  const res = source === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  return res.canceled ? null : res.assets[0] ?? null;
}

export async function pickVideo(): Promise<Asset | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], videoMaxDuration: MAX_VIDEO_SECONDS, allowsMultipleSelection: false });
  return res.canceled ? null : res.assets[0] ?? null;
}

const encode = async (uri: string, width: number, height: number, compress: number, crop?: { originX: number; originY: number; width: number; height: number }) => {
  const ctx = ImageManipulator.manipulate(uri);
  if (crop) ctx.crop(crop);
  ctx.resize({ width, height });
  const ref = await ctx.renderAsync();
  const out = await ref.saveAsync({ format: SaveFormat.JPEG, compress, base64: true });
  return { data: out.base64 ?? "", w: out.width, h: out.height };
};

const fit = (a: Asset, edge: number) => {
  const scale = Math.min(1, edge / Math.max(a.width, a.height, 1));
  return { w: Math.max(1, Math.round(a.width * scale)), h: Math.max(1, Math.round(a.height * scale)) };
};

/** A chat photo: up to 1280 px, lowering the quality first and then the size until it fits (as on the web). */
export async function prepareImage(a: Asset): Promise<PreparedImage> {
  if (!a.width || !a.height) throw new ChatMediaError("Couldn't open that picture. Try a different one.");
  let edge = 1280;
  for (let attempt = 0; attempt < 4; attempt++) {
    const { w, h } = fit(a, edge);
    for (const q of [0.82, 0.68, 0.55]) {
      const out = await encode(a.uri, w, h, q);
      if (out.data && out.data.length <= MAX_DATA_CHARS) return { mime: "image/jpeg", data: out.data, w: out.w, h: out.h };
    }
    edge = Math.round(edge * 0.75);
  }
  throw new ChatMediaError("That picture is too large to send. Try a smaller one.");
}

/** Truth or dare proof: much smaller, because it lives inside the game document. */
export async function prepareProofImage(a: Asset): Promise<PreparedImage> {
  for (const edge of [560, 480, 400, 320]) {
    const { w, h } = fit(a, edge);
    for (const q of [0.62, 0.5, 0.4]) {
      const out = await encode(a.uri, w, h, q);
      if (out.data && out.data.length <= MAX_PROOF_CHARS) return { mime: "image/jpeg", data: out.data, w: out.w, h: out.h };
    }
  }
  throw new ChatMediaError("That picture is too large to send. Try a different one.");
}

export async function prepareWallpaper(a: Asset): Promise<string> {
  for (const edge of [1080, 900, 720, 560]) {
    const { w, h } = fit(a, edge);
    for (const q of [0.72, 0.6, 0.48]) {
      const out = await encode(a.uri, w, h, q);
      if (out.data && out.data.length <= 520_000) return out.data;
    }
  }
  throw new ChatMediaError("That picture is too large for a wallpaper. Try a different one.");
}

/** A square profile picture cropped from the middle, as a data URL (the profile stores it that way). */
export async function prepareAvatar(a: Asset): Promise<string> {
  const side = Math.min(a.width, a.height);
  const crop = { originX: Math.round((a.width - side) / 2), originY: Math.round((a.height - side) / 2), width: side, height: side };
  for (const px of [320, 256, 192]) {
    const out = await encode(a.uri, px, px, 0.8, crop);
    if (out.data && out.data.length <= 90_000) return `data:image/jpeg;base64,${out.data}`;
  }
  throw new ChatMediaError("That picture is too large. Try a different one.");
}

/**
 * A live picture for the partner's home-screen widget: a square from the middle (the widget is square), small
 * enough that the widget can draw it from memory and the encrypted copy stays well inside a document.
 */
export async function prepareLivePic(a: Asset): Promise<string> {
  if (!a.width || !a.height) throw new ChatMediaError("Couldn't open that picture. Try a different one.");
  const side = Math.min(a.width, a.height);
  const crop = { originX: Math.round((a.width - side) / 2), originY: Math.round((a.height - side) / 2), width: side, height: side };
  for (const px of [720, 600, 480]) {
    for (const q of [0.78, 0.64]) {
      const out = await encode(a.uri, px, px, q, crop);
      if (out.data && out.data.length <= 360_000) return out.data;
    }
  }
  throw new ChatMediaError("That picture is too large. Try a different one.");
}

/** Checks a video against the limits and reads what the bubble needs: length, shape and a small still. */
export async function prepareVideo(a: Asset): Promise<PreparedVideo> {
  const file = new File(a.uri);
  const size = a.fileSize ?? file.size ?? 0;
  if (size > MAX_VIDEO_BYTES) throw new ChatMediaError("That video is over 25 MB. Pick a shorter or smaller one.");
  const seconds = (a.duration ?? 0) / 1000;
  if (!(seconds > 0)) throw new ChatMediaError("Couldn't read that video's length. Try a different one.");
  if (seconds > MAX_VIDEO_SECONDS + 0.5) throw new ChatMediaError("Videos can be up to 2 minutes long.");
  let thumb = "";
  try {
    const still = await VideoThumbnails.getThumbnailAsync(a.uri, { time: 100, quality: 0.6 });
    const s = Math.min(1, 360 / Math.max(still.width, still.height, 1));
    const small = await encode(still.uri, Math.max(1, Math.round(still.width * s)), Math.max(1, Math.round(still.height * s)), 0.6);
    thumb = small.data;
  } catch { /* the bubble shows a plain play button instead */ }
  const bytes = await file.bytes();
  if (bytes.byteLength > MAX_VIDEO_BYTES) throw new ChatMediaError("That video is over 25 MB. Pick a shorter or smaller one.");
  return { mime: a.mimeType || "video/mp4", bytes, dur: Math.max(1, Math.round(seconds)), w: a.width, h: a.height, thumb, size: bytes.byteLength };
}
