// Photos and voice notes for chat are squeezed on the device, then stored inside the message
// itself as base64. The security rules allow 700,000 characters per file; these limits sit under that.

export const MAX_DATA_CHARS = 640_000;
export const MAX_VOICE_SECONDS = 60;
const MAX_EDGE = 1280;

export class ChatMediaError extends Error {}

export interface PreparedImage { mime: "image/jpeg"; data: string; w: number; h: number }
export interface VoiceClip { mime: string; data: string; dur: number }

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new ChatMediaError("Couldn't read that file."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.readAsDataURL(blob);
  });

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));

const openBitmap = async (file: File) => {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Older browsers don't know the orientation option
    return createImageBitmap(file);
  }
};

/**
 * Shrink a picture to something that fits in a message. Redrawing it also drops the location
 * and camera details a photo carries.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) throw new ChatMediaError("That file isn't a picture.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await openBitmap(file);
  } catch {
    throw new ChatMediaError("Couldn't open that picture. Try a different one.");
  }

  let edge = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  try {
    // Lower the quality first, then the size, until it fits
    for (let attempt = 0; attempt < 4; attempt++) {
      const w = Math.max(1, Math.round(bitmap.width * edge));
      const h = Math.max(1, Math.round(bitmap.height * edge));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new ChatMediaError("Couldn't prepare that picture.");
      ctx.fillStyle = "#fff"; // transparent PNGs would otherwise turn black
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(bitmap, 0, 0, w, h);
      for (const quality of [0.82, 0.68, 0.55]) {
        const blob = await canvasToBlob(canvas, quality);
        if (!blob) continue;
        const data = await blobToBase64(blob);
        if (data.length <= MAX_DATA_CHARS) return { mime: "image/jpeg", data, w, h };
      }
      edge *= 0.75;
    }
  } finally {
    bitmap.close?.();
  }
  throw new ChatMediaError("That picture is too large to send. Try a smaller one.");
}

const RECORDER_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

export const pickRecorderType = () =>
  typeof MediaRecorder === "undefined" ? "" : RECORDER_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) || "";

export const canRecordVoice = () =>
  typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";

// The stored type has no codec suffix, so it matches what the rules accept
export const baseMime = (type: string) => (type.split(";")[0] || "audio/webm").trim();

export async function clipFromChunks(chunks: Blob[], type: string, seconds: number): Promise<VoiceClip> {
  const blob = new Blob(chunks, { type });
  const data = await blobToBase64(blob);
  if (!data || data.length > MAX_DATA_CHARS) throw new ChatMediaError("That voice note is too long to send. Try a shorter one.");
  return { mime: baseMime(type), data, dur: Math.max(1, Math.round(seconds)) };
}

/** A playable address for stored base64 media. Blob addresses seek and stream better than data addresses. */
export function mediaUrl(mime: string, data: string) {
  const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

export const formatClock = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
