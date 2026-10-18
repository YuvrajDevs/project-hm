"use client";

import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
    // A new version went live while this tab was open, so this screen's code no longer exists.
    // Reloading picks up the new version. At most once a minute, so a real outage can't loop.
    if (error?.name === "ChunkLoadError" || /Loading chunk|Failed to load chunk/i.test(error?.message || "")) {
      try {
        const last = Number(sessionStorage.getItem("hm_chunk_reload") || 0);
        if (Date.now() - last > 60_000) {
          sessionStorage.setItem("hm_chunk_reload", String(Date.now()));
          window.location.reload();
        }
      } catch {}
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--page)] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-[#161616] border border-[#2a2a2a] rounded-[1.5rem] p-8 text-center space-y-6">
        <img src="/mascot.webp" alt="" className="w-12 h-auto mx-auto" />
        <div className="space-y-2">
          <h1 className="text-3xl font-bebas tracking-widest uppercase">Something Went Wrong</h1>
          <p className="text-neutral-400 font-outfit text-sm leading-relaxed">
            This screen hit a problem. Nothing you wrote has been lost. Try again, or go back home.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => unstable_retry()}
            className="w-full bg-white text-black font-bebas tracking-widest uppercase rounded-2xl py-4 hover:bg-neutral-200 active:scale-95 transition-all"
          >
            Try Again
          </button>
          <button
            onClick={() => { window.location.href = "/"; }}
            className="w-full bg-[#161616] border border-[#2a2a2a] text-white font-bebas tracking-widest uppercase rounded-2xl py-4 hover:bg-[#242424] transition-all"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
