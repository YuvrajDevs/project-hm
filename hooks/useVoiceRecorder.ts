"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChatMediaError, MAX_VOICE_SECONDS, canRecordVoice, clipFromChunks, pickRecorderType, type VoiceClip,
} from "@/lib/chatMedia";

// Record a voice note: tap to start, then send or cancel. Stops by itself at the time limit.
export const useVoiceRecorder = (onClip: (clip: VoiceClip) => void, onError: (message: string) => void) => {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const keep = useRef(true); // false when the recording is being thrown away
  const starting = useRef(false);
  const callbacks = useRef({ onClip, onError });
  useEffect(() => { callbacks.current = { onClip, onError }; });

  const release = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    recorder.current = null;
    setRecording(false);
    setSeconds(0);
  }, []);

  const stop = useCallback((send: boolean) => {
    keep.current = send;
    const r = recorder.current;
    if (r && r.state !== "inactive") r.stop();
    else release();
  }, [release]);

  const start = useCallback(async () => {
    if (recorder.current || starting.current) return;
    if (!canRecordVoice()) {
      callbacks.current.onError("Voice notes aren't supported in this browser.");
      return;
    }
    starting.current = true;
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = pickRecorderType();
      const r = new MediaRecorder(media, type ? { mimeType: type, audioBitsPerSecond: 24000 } : { audioBitsPerSecond: 24000 });
      stream.current = media;
      recorder.current = r;
      chunks.current = [];
      keep.current = true;
      r.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      r.onstop = async () => {
        const seconds = (Date.now() - startedAt.current) / 1000;
        const send = keep.current;
        const parts = chunks.current;
        const mime = r.mimeType || type || "audio/webm";
        release();
        if (!send) return;
        if (seconds < 1) {
          callbacks.current.onError("That was too short. Tap the mic and talk for a moment.");
          return;
        }
        try {
          callbacks.current.onClip(await clipFromChunks(parts, mime, seconds));
        } catch (err) {
          callbacks.current.onError(err instanceof ChatMediaError ? err.message : "Couldn't save that voice note.");
        }
      };
      startedAt.current = Date.now();
      r.start();
      setRecording(true);
      timer.current = setInterval(() => {
        const elapsed = (Date.now() - startedAt.current) / 1000;
        setSeconds(elapsed);
        if (elapsed >= MAX_VOICE_SECONDS) stop(true);
      }, 200);
    } catch (err) {
      console.error(err);
      release();
      const denied = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError");
      callbacks.current.onError(denied ? "Allow microphone access to send voice notes." : "Couldn't start the microphone.");
    } finally {
      starting.current = false;
    }
  }, [release, stop]);

  // Leaving the screen mid-recording throws the recording away and frees the microphone
  useEffect(() => () => {
    keep.current = false;
    const r = recorder.current;
    if (r && r.state !== "inactive") r.stop();
    if (timer.current) clearInterval(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
  }, []);

  return { recording, seconds, start, send: () => stop(true), cancel: () => stop(false) };
};
