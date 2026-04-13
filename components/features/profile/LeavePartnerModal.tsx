"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, AlertTriangle, ArrowRight, HeartOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeavePartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  partnerName: string;
}

export const LeavePartnerModal: React.FC<LeavePartnerModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  partnerName
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm bg-[#111] border border-white/5 rounded-[2.5rem] p-8 overflow-hidden shadow-2xl"
          >
            {/* Visual Ambiance */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
            
            <div className="space-y-8 relative z-10">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                  {step === 1 ? <Heart className="w-6 h-6" /> : <HeartOff className="w-6 h-6" />}
                </div>
                <button onClick={onClose} className="p-2 text-neutral-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <h2 className="text-3xl font-bebas tracking-wider uppercase leading-none">
                  {step === 1 ? "Heart-to-Heart" : "Are you certain?"}
                </h2>
                <div className="text-neutral-400 text-sm font-outfit leading-relaxed">
                  {step === 1 ? (
                    <>
                      Every relationship has its storms. Leaving is a big step. 
                      Before you go, take a breath. Are you sure you've said everything 
                      you needed to say to <span className="text-white font-medium">{partnerName}</span>?
                    </>
                  ) : (
                    <>
                      This will close your shared safe space immediately and **permanently delete** your shared history. 
                      You can always reconnect as a fresh pair later, but this journey will be wiped. <br/><br/>
                      <span className="text-red-400/80 font-bebas uppercase tracking-widest">Wiping Shared Memories & Messages</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {step === 1 ? (
                  <>
                    <button
                      onClick={() => setStep(2)}
                      className="w-full py-4 bg-white text-black rounded-2xl font-bebas tracking-widest uppercase hover:bg-neutral-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      I still want to leave <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={onClose}
                      className="w-full py-4 bg-white/5 text-white border border-white/5 rounded-2xl font-bebas tracking-widest uppercase hover:bg-white/10 transition-all font-medium"
                    >
                      Give it another try
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleConfirm}
                      disabled={loading}
                      className="w-full py-4 bg-red-600 text-white rounded-2xl font-bebas tracking-widest uppercase hover:bg-red-500 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? "Closing space..." : "End connection now"}
                    </button>
                    <button
                      onClick={() => setStep(1)}
                      className="w-full py-4 bg-white/5 text-white border border-white/5 rounded-2xl font-bebas tracking-widest uppercase hover:bg-white/10 transition-all"
                    >
                      Go back
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {/* Background elements */}
            <div className="absolute -bottom-20 -right-20 w-40 h-40 rounded-full" style={{ backgroundImage: "radial-gradient(circle at center, rgba(239,68,68,0.05), transparent 70%)" }} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
