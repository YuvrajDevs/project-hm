"use client";

import React, { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMailbox } from "@/context/MailboxContext";
import {
  backupKeyExists, backupLocalKey, fingerprint, getKeyHint, hasLocalPrivateKey, restoreFromBackup,
} from "@/lib/e2ee";
import { resetChatKey } from "@/lib/firestore-helpers";
import { requestResetCode, verifyResetCode } from "@/lib/chatReset";
import { partnerLabel } from "@/lib/utils";

// Lets each person verify the pairing (a safety number, from each side's public key) and optionally
// back up their chat key with a passphrase so it can be restored on a new device. Out of scope here:
// mailbox/notes/check-ins are not end-to-end encrypted yet (see SECURITY.md).
export const ChatEncryptionSettings = () => {
  const { user, partner, couple } = useMailbox();
  const uid = user?.uid;
  const partnerUid = partner?.uid;

  const [status, setStatus] = useState<"loading" | "needsRestore" | "ready">("loading");
  const [myFingerprint, setMyFingerprint] = useState<string | null>(null);
  const [partnerFingerprint, setPartnerFingerprint] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [hasBackup, setHasBackup] = useState(false);
  // Forgotten-passphrase reset: "idle" -> "warn" (irreversible-action confirmation) -> "code"
  // (6-digit code emailed to this account, then resetChatKey destroys the old key).
  const [resetStage, setResetStage] = useState<"idle" | "warn" | "code">("idle");
  const [resetCode, setResetCode] = useState("");

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const [hasLocal, backup, savedHint] = await Promise.all([hasLocalPrivateKey(uid), backupKeyExists(uid), getKeyHint(uid)]);
      setHasBackup(backup);
      setHint(savedHint);
      setStatus(!hasLocal && backup ? "needsRestore" : "ready");

      const mySnap = await getDoc(doc(db, "users", uid));
      const myJwk = mySnap.data()?.chatPublicKey;
      if (hasLocal && myJwk) setMyFingerprint(await fingerprint(myJwk));

      if (partnerUid) {
        const partnerSnap = await getDoc(doc(db, "users", partnerUid));
        const partnerJwk = partnerSnap.data()?.chatPublicKey;
        if (partnerJwk) setPartnerFingerprint(await fingerprint(partnerJwk));
      }
    })().catch(console.error);
  }, [uid, partnerUid]);

  if (!couple || !uid) return null;

  const submitBackup = async () => {
    setMessage("");
    if (passphrase.length < 8) return setMessage("Use at least 8 characters.");
    if (passphrase !== confirm) return setMessage("Those don't match.");
    setBusy(true);
    try {
      await backupLocalKey(uid, passphrase, hint.trim());
      setHasBackup(true);
      setPassphrase("");
      setConfirm("");
      setMessage("Backup saved.");
    } catch {
      setMessage("Couldn't save the backup. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const submitRestore = async () => {
    setMessage("");
    setBusy(true);
    try {
      await restoreFromBackup(uid, passphrase);
      setPassphrase("");
      setStatus("ready");
      setMessage("Restored.");
    } catch {
      setMessage("That passphrase didn't work.");
    } finally {
      setBusy(false);
    }
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
      await resetChatKey(uid, couple.id);
      setHasBackup(false);
      setHint("");
      setResetStage("idle");
      setResetCode("");
      setStatus("ready");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "That code didn't work.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-bebas text-neutral-500 tracking-[0.2em] uppercase">Chat Encryption</h2>
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6 space-y-5">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#1c1c1c] rounded-xl shrink-0"><Lock className="w-5 h-5 text-white" /></div>
          <div>
            <p className="font-bebas tracking-widest uppercase text-lg">End-to-end encrypted</p>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              Chat messages, photos and voice notes can only be read on your two devices - not by anyone with
              access to the server. There&apos;s no forward secrecy: a device that gets your current key could
              still read messages sent with it. Losing the passphrase below means chat history can&apos;t be
              recovered; mailbox, notes and check-ins aren&apos;t end-to-end encrypted yet.
            </p>
          </div>
        </div>

        {(myFingerprint || partnerFingerprint) && (
          <div className="pt-4 border-t border-white/5 space-y-3">
            <p className="font-bebas text-[10px] tracking-[0.3em] uppercase text-neutral-500">Safety number</p>
            <p className="text-xs text-neutral-400 leading-relaxed">Compare these with your partner to make sure you&apos;re really talking to each other.</p>
            {myFingerprint && (
              <div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">You</p>
                <p className="font-mono text-sm text-white tracking-wide">{myFingerprint}</p>
              </div>
            )}
            {partnerFingerprint && (
              <div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">{partnerLabel(user, partner, "Your partner")}</p>
                <p className="font-mono text-sm text-white tracking-wide">{partnerFingerprint}</p>
              </div>
            )}
          </div>
        )}

        <div className="pt-4 border-t border-white/5 space-y-3">
          {status === "loading" ? null : status === "needsRestore" ? (
            <>
              <p className="font-bebas text-[10px] tracking-[0.3em] uppercase text-neutral-500">Restore on this device</p>
              <p className="text-xs text-neutral-400 leading-relaxed">
                This device doesn&apos;t have your chat key yet. Enter your backup passphrase to restore it.
              </p>
              {hint && resetStage === "idle" && <p className="text-xs text-neutral-500 font-outfit">Hint: {hint}</p>}
              {resetStage === "idle" && (
                <>
                  <input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Backup passphrase"
                    className="w-full px-4 py-3 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] text-sm font-outfit text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                  <button
                    type="button"
                    onClick={submitRestore}
                    disabled={busy || !passphrase}
                    className="w-full py-3 bg-white text-black rounded-xl font-bebas tracking-widest uppercase hover:bg-neutral-200 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {busy ? "Restoring..." : "Restore"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetStage("warn")}
                    disabled={busy}
                    className="w-full text-xs font-outfit text-neutral-500 underline disabled:opacity-50"
                  >
                    Forgot your passphrase? Reset it
                  </button>
                </>
              )}
              {resetStage === "warn" && (
                <>
                  <p className="text-xs text-rose-400 font-outfit leading-relaxed">
                    Resetting makes this device your chat key and permanently erases every chat message
                    you&apos;ve sent, on every device. This cannot be undone. We&apos;ll email a 6-digit
                    code to confirm it&apos;s really you first.
                  </p>
                  <button
                    type="button"
                    onClick={sendResetCode}
                    disabled={busy}
                    className="w-full py-3 bg-[#1c1c1c] border border-[#2a2a2a] text-white rounded-xl font-bebas tracking-widest uppercase active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {busy ? "Sending..." : "Email me a reset code"}
                  </button>
                  <button type="button" onClick={() => setResetStage("idle")} className="w-full text-xs font-outfit text-neutral-500 underline">Cancel</button>
                </>
              )}
              {resetStage === "code" && (
                <>
                  <p className="text-xs text-neutral-400 font-outfit leading-relaxed">Enter the 6-digit code we emailed you. It expires in 10 minutes.</p>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-4 py-3 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] text-sm font-outfit text-white text-center tracking-[0.5em] placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                  <button
                    type="button"
                    onClick={confirmReset}
                    disabled={busy || resetCode.length !== 6}
                    className="w-full py-3 bg-rose-500 text-white rounded-xl font-bebas tracking-widest uppercase active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {busy ? "Resetting..." : "Confirm reset - erase chat history"}
                  </button>
                  <button type="button" onClick={() => setResetStage("idle")} className="w-full text-xs font-outfit text-neutral-500 underline">Cancel</button>
                </>
              )}
            </>
          ) : (
            <>
              <p className="font-bebas text-[10px] tracking-[0.3em] uppercase text-neutral-500">
                {hasBackup ? "Update backup passphrase" : "Back up chat encryption"}
              </p>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Lets you restore chat on a new device. We never store the passphrase itself.
              </p>
              <p className="text-xs text-rose-400 font-outfit leading-relaxed">
                Remember this passphrase. If you forget it, resetting it is the only way back in -
                and that erases every chat message you&apos;ve sent, forever.
              </p>
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="New passphrase (8+ characters)"
                className="w-full px-4 py-3 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] text-sm font-outfit text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm passphrase"
                className="w-full px-4 py-3 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] text-sm font-outfit text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              <input
                type="text"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="Optional hint to help you remember it"
                maxLength={120}
                className="w-full px-4 py-3 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] text-sm font-outfit text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              <button
                type="button"
                onClick={submitBackup}
                disabled={busy || !passphrase || !confirm}
                className="w-full py-3 bg-white text-black rounded-xl font-bebas tracking-widest uppercase hover:bg-neutral-200 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {busy ? "Saving..." : hasBackup ? "Update backup" : "Save backup"}
              </button>
            </>
          )}
          {message && <p role="alert" className="text-xs text-neutral-300 font-outfit">{message}</p>}
        </div>
      </div>
    </section>
  );
};
