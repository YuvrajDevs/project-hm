"use client";

import React, { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { backupKeyExists, restoreFromBackup, rotateKeys } from "@/lib/e2ee";

// Shown when this device doesn't hold the chat key that is published for the account (a phone and a laptop
// each start with their own key). Unlock it with the backup passphrase, or start fresh on this device.
export const DeviceKeyGate = ({ uid, onDone }: { uid: string; onDone: () => void }) => {
  const [hasBackup, setHasBackup] = useState<boolean | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmFresh, setConfirmFresh] = useState(false);

  useEffect(() => { backupKeyExists(uid).then(setHasBackup).catch(() => setHasBackup(false)); }, [uid]);

  const unlock = async () => {
    setBusy(true); setMessage("");
    try { await restoreFromBackup(uid, passphrase); onDone(); }
    catch { setMessage("That passphrase didn't work."); }
    finally { setBusy(false); }
  };
  const startFresh = async () => {
    setBusy(true); setMessage("");
    try { await rotateKeys(uid); onDone(); }
    catch { setMessage("Couldn't start fresh. Try again."); }
    finally { setBusy(false); }
  };

  const input = "w-full h-12 px-4 rounded-2xl bg-[#1c1c1c] border border-[#2a2a2a] font-outfit text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/30";
  const button = "w-full h-12 rounded-2xl font-bebas tracking-widest uppercase text-base active:scale-95 disabled:opacity-40 transition-all";

  return (
    <div className="absolute inset-0 z-30 bg-[var(--page)] flex items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col gap-5 text-center">
        <div className="mx-auto p-4 rounded-2xl bg-[#161616] text-neutral-300"><Lock className="w-6 h-6" /></div>
        <div className="space-y-2">
          <p className="font-bebas text-2xl tracking-widest uppercase">Unlock chat on this device</p>
          <p className="font-outfit text-sm text-neutral-500 leading-relaxed text-pretty">
            Your chat is end-to-end encrypted, and this device doesn&apos;t have your key yet.
            {hasBackup ? " Enter your backup passphrase to read your messages here." : " Open the device you first chatted on, then back up your key from Settings so you can unlock it here."}
          </p>
        </div>
        {hasBackup && (
          <div className="space-y-3">
            <input type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} placeholder="Backup passphrase" className={input} onKeyDown={(e) => { if (e.key === "Enter" && passphrase && !busy) unlock(); }} />
            <button type="button" onClick={unlock} disabled={busy || !passphrase} className={`${button} bg-white text-black`}>Unlock</button>
          </div>
        )}
        {message && <p role="alert" className="font-outfit text-sm text-rose-400">{message}</p>}
        {confirmFresh ? (
          <div className="space-y-3">
            <p className="font-outfit text-xs text-neutral-500 leading-relaxed">
              Starting fresh makes this device your chat key. Earlier messages stay unreadable, and your other devices will need to unlock again.
            </p>
            <button type="button" onClick={startFresh} disabled={busy} className={`${button} bg-[#1c1c1c] border border-[#2a2a2a] text-white`}>Yes, start fresh here</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmFresh(true)} className="font-outfit text-xs text-neutral-500 underline underline-offset-4 hover:text-neutral-300">
            Start fresh on this device instead
          </button>
        )}
      </div>
    </div>
  );
};
