"use client";

import { useRef, useCallback, useEffect } from "react";

export const useSensoryFeedback = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Only init if window exists
    if (typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
  }, []);

  const resumeCtx = async () => {
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      await audioCtxRef.current.resume();
    }
  };

  const playPop = useCallback(async () => {
    if (!audioCtxRef.current) return;
    await resumeCtx();
    
    const ctx = audioCtxRef.current;
    if (ctx.state !== "running") return;
    
    // Create oscillator and gain
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = "sine";
    // Quick sweep up
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);
    
    // Quick fade out
    gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.1);

    // Haptic if available
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(20);
    }
  }, []);

  const playSend = useCallback(async () => {
    if (!audioCtxRef.current) return;
    await resumeCtx();
    
    const ctx = audioCtxRef.current;
    if (ctx.state !== "running") return;
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = "triangle";
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.3);

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([30, 50, 40]);
    }
  }, []);

  const playHeartbeat = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([100, 100, 150]);
    }

    if (!audioCtxRef.current) return;
    await resumeCtx();
    
    const ctx = audioCtxRef.current;
    if (ctx.state !== "running") return;

    // Deep sub-bass thud
    const playThump = (timeOffset: number) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(80, ctx.currentTime + timeOffset);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + timeOffset + 0.1);
        
        gainNode.gain.setValueAtTime(0, ctx.currentTime + timeOffset);
        gainNode.gain.linearRampToValueAtTime(0.8, ctx.currentTime + timeOffset + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + timeOffset + 0.3);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(ctx.currentTime + timeOffset);
        osc.stop(ctx.currentTime + timeOffset + 0.3);
    }
    
    playThump(0);
    playThump(0.2);
  }, []);

  const vibrateTick = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, []);

  return { playPop, playSend, playHeartbeat, vibrateTick };
};
