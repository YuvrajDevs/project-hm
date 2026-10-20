"use client";

import React, { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { backupKeyExists, completeKeySetup, getKeyHint, restoreFromBackup, type KeyStatus } from "@/lib/e2ee";
import { resetChatKey } from "@/lib/firestore-helpers";
import { requestResetCode, verifyResetCode } from "@/lib/chatReset";

// Shown either when this device needs a passphrase set before its key can be backed up and
// published ("needs-setup" - first use, or an existing key with no backup yet), or when this
// device doesn't hold the key published for the account ("needs-unlock" - a second device or
// browser). Unlock with the backup passphrase, or - if it's truly forgotten - reset it: that
// requires an emailed code and destroys this person's own chat history, so it's deliberately not
// a single tap.
export const DeviceKeyGate = ({ uid, coupleId, keyStatus, onDone }: { uid: string; coupleId: string; keyStatus: KeyStatus; onDone: () => void }) => {
  const [hasBackup, setHasBackup] = useState<boolean | null>(null);
  const [hint, setHint] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  // Forgotten-passphrase reset: "idle" (not started) -> "warn" (irreversible-action confirmation)
  // -> "code" (6-digit code emailed to this account, then resetChatKey destroys the old key).
  const [resetStage, setResetStage] = useState<"idle" | "warn" | "code">("idle");
  const [resetCode, setResetCode] = useState("");

  useEffect(() => { backupKeyExists(uid).then(setHasBackup).catch(() => setHasBackup(false)); }, [uid]);
  useEffect(() => { if (keyStatus === "needs-unlock") getKeyHint(uid).then(setHint).catch(() => setHint("")); }, [uid, keyStatus]);

  const setup = async () => {
    setMessage("");
    if (passphrase.length < 8) return setMessage("Use at least 8 characters.");
    if (passphrase !== confirm) return setMessage("Those don't match.");
    setBusy(true);
    try { await completeKeySetup(uid, passphrase, hint.trim()); onDone(); }
    catch { setMessage("Couldn't save that. Try again."); }
    finally { setBusy(false); }
  };
  const unlock = async () => {
    setBusy(true); setMessage("");
    try { await restoreFromBackup(uid, passphrase); onDone(); }
    catch { setMessage("That passphrase didn't work."); }
    finally { setBusy(false); }
  };
  const sendResetCode = async () => {
    setMessage(""); setBusy(true);
    try { await requestResetCode(); setResetStage("code"); }
    catch (err) { setMessage(err instanceof Error ? err.message : "Couldn't send the code. Try again."); }
    finally { setBusy(false); }
  };
  const confirmReset = async () => {
    setMessage(""); setBusy(true);
    try {
      await verifyResetCode(resetCode);
      await resetChatKey(uid, coupleId);
      onDone();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "That code didn't work.");
    } finally {
      setBusy(false);
    }
  };

  const input = "w-full h-12 px-4 rounded-2xl bg-[#1c1c1c] border border-[#2a2a2a] font-outfit text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/30";
  const button = "w-full h-12 rounded-2xl font-bebas tracking-widest uppercase text-base active:scale-95 disabled:opacity-40 transition-all";

  if (keyStatus === "needs-setup") {
    return (
      <div className="absolute inset-0 z-30 bg-[var(--page)] flex items-center justify-center p-6">
        <div className="w-full max-w-sm flex flex-col gap-5 text-center">
          <div className="mx-auto p-4 rounded-2xl bg-[#161616] text-neutral-300"><Lock className="w-6 h-6" /></div>
          <div className="space-y-2">
            <p className="font-bebas text-2xl tracking-widest uppercase">Secure this chat</p>
            <p className="font-outfit text-sm text-neutral-500 leading-relaxed text-pretty">
              Chat is end-to-end encrypted. Set a passphrase to back up your key, so you can read your
              messages on another device later. We never store the passphrase itself.
            </p>
            <p className="font-outfit text-sm text-rose-400 leading-relaxed text-pretty">
              Remember this passphrase. If you forget it, resetting it is the only way back in - and that
              erases every chat message you&apos;ve sent, forever.
            </p>
          </div>
          <div className="space-y-3">
            <input type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} placeholder="New passphrase (8+ characters)" className={input} />
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm passphrase" className={input} />
            <input type="text" value={hint} onChange={(e) => setHint(e.target.value)} placeholder="Optional hint to help you remember it" maxLength={120} className={input} onKeyDown={(e) => { if (e.key === "Enter" && passphrase && confirm && !busy) setup(); }} />
            <button type="button" onClick={setup} disabled={busy || !passphrase || !confirm} className={`${button} bg-white text-black`}>Continue</button>
          </div>
          {message && <p role="alert" className="font-outfit text-sm text-rose-400">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-30 bg-[var(--page)] flex items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col gap-5 text-center">
        <div className="mx-auto p-4 rounded-2xl bg-[#161616] text-neutral-300"><Lock className="w-6 h-6" /></div>
        <div className="space-y-2">
          <p className="font-bebas text-2xl tracking-widest uppercase">Unlock chat on this device</p>
          <p className="font-outfit text-sm text-neutral-500 leading-relaxed text-pretty">
            Your chat is end-to-end encrypted, and this device doesn&apos;t have your key yet.
            {hasBackup ? " Enter your backup passphrase to read your messages here." : " Open the device you first chatted on and set a backup passphrase there, then enter it here."}
          </p>
        </div>
        {hasBackup && resetStage === "idle" && (
          <div className="space-y-3">
            {hint && <p className="font-outfit text-xs text-neutral-500">Hint: {hint}</p>}
            <input type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} placeholder="Backup passphrase" className={input} onKeyDown={(e) => { if (e.key === "Enter" && passphrase && !busy) unlock(); }} />
            <button type="button" onClick={unlock} disabled={busy || !passphrase} className={`${button} bg-white text-black`}>Unlock</button>
          </div>
        )}
        {message && <p role="alert" className="font-outfit text-sm text-rose-400">{message}</p>}

        {resetStage === "idle" && (
          <button type="button" onClick={() => setResetStage("warn")} className="font-outfit text-xs text-neutral-500 underline underline-offset-4 hover:text-neutral-300">
            Forgot your passphrase? Reset it
          </button>
        )}
        {resetStage === "warn" && (
          <div className="space-y-3">
            <p className="font-outfit text-xs text-rose-400 leading-relaxed">
              Resetting makes this device your chat key and permanently erases every chat message
              you&apos;ve sent, on every device. This cannot be undone. We&apos;ll email a 6-digit code
              to confirm it&apos;s really you first.
            </p>
            <button type="button" onClick={sendResetCode} disabled={busy} className={`${button} bg-[#1c1c1c] border border-[#2a2a2a] text-white`}>
              {busy ? "Sending..." : "Email me a reset code"}
            </button>
            <button type="button" onClick={() => setResetStage("idle")} className="font-outfit text-xs text-neutral-500 underline underline-offset-4 hover:text-neutral-300">Cancel</button>
          </div>
        )}
        {resetStage === "code" && (
          <div className="space-y-3">
            <p className="font-outfit text-xs text-neutral-500 leading-relaxed">Enter the 6-digit code we emailed you. It expires in 10 minutes.</p>
            <input type="text" inputMode="numeric" value={resetCode} onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" className={`${input} text-center tracking-[0.5em]`} onKeyDown={(e) => { if (e.key === "Enter" && resetCode.length === 6 && !busy) confirmReset(); }} />
            <button type="button" onClick={confirmReset} disabled={busy || resetCode.length !== 6} className={`${button} bg-rose-500 text-white`}>
              {busy ? "Resetting..." : "Confirm reset - erase chat history"}
            </button>
            <button type="button" onClick={() => setResetStage("idle")} className="font-outfit text-xs text-neutral-500 underline underline-offset-4 hover:text-neutral-300">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
};
