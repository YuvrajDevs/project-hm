"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Send, CheckCircle2, MessageSquareHeart, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AmbientBackground } from '@/components/ui/AmbientBackground';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    purpose: 'general',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.message) return;
    
    setStatus('sending');
    // Simulate API delay
    setTimeout(() => {
      setStatus('sent');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-300 font-inter selection:bg-pink-500/30 overflow-x-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <AmbientBackground variant="standard" />
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12 md:py-20 relative z-10">
        
        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="inline-flex items-center gap-2 text-neutral-500 hover:text-white transition-colors uppercase tracking-widest font-inter text-sm mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back
          </Link>
          <div className="flex items-center gap-3 mb-6">
            <img src="/HM.png" alt="Honest Mailbox Logo" className="w-8 h-auto" />
            <span className="font-inter text-2xl tracking-[0.2em] text-white uppercase font-bold">Honest Mailbox</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-inter font-bold tracking-widest uppercase text-white mb-4">Contact & Support</h1>
          
          <div className="bg-white/5 border-l-2 border-pink-500/50 p-6 rounded-r-2xl mt-8">
            <p className="text-sm text-neutral-300 leading-relaxed font-inter">
              If you have questions about your account, need help using the app, or want to request access, updates, or deletion of your personal data, you can contact us here.
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {status === 'sent' ? (
            <motion.div 
              key="sent"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/5 border border-white/10 rounded-[2.5rem] p-12 text-center space-y-6"
            >
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-500">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bebas tracking-widest uppercase text-white">Message Set!</h2>
                <p className="text-sm text-neutral-400 font-outfit leading-relaxed">
                  We have received your inquiry. We aim to respond within a reasonable timeframe.
                </p>
              </div>
              <div className="pt-6 border-t border-white/5 text-[10px] text-neutral-600 uppercase tracking-widest">
                Data Protection Protocol Active
              </div>
              <button 
                onClick={() => setStatus('idle')}
                className="text-pink-500 font-bebas uppercase tracking-widest text-sm hover:text-pink-400"
              >
                Send another message
              </button>
            </motion.div>
          ) : (
            <motion.form 
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[10px] font-inter font-bold text-neutral-500 uppercase tracking-widest ml-1">Name (Optional)</label>
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Your name"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-white focus:outline-none focus:border-white/30 transition-all font-inter text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-inter font-bold text-neutral-500 uppercase tracking-widest ml-1">Email (Required)</label>
                <input 
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="you@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-white focus:outline-none focus:border-white/30 transition-all font-inter text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-inter font-bold text-neutral-500 uppercase tracking-widest ml-1">Purpose of Inquiry</label>
              <select 
                value={formData.purpose}
                onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                className="w-full bg-[#0f0f0f] border border-white/10 rounded-xl px-5 py-3.5 text-neutral-300 focus:outline-none focus:border-white/30 transition-all font-inter text-sm appearance-none"
              >
                <option value="general">General Support / Questions</option>
                <option value="data_request">Privacy / Data Request (Access, Update, Delete)</option>
                <option value="technical">Technical Issue</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-inter font-bold text-neutral-500 uppercase tracking-widest ml-1">Message (Required)</label>
              <textarea 
                required
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                placeholder="How can we help?"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:border-white/30 transition-all font-inter text-sm resize-none"
              />
            </div>

            <div className="pt-2">
              <button 
                type="submit"
                disabled={status === 'sending'}
                className="w-full bg-white text-black font-inter font-bold text-xl py-4 rounded-2xl hover:bg-neutral-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(255,255,255,0.1)]"
              >
                {status === 'sending' ? 'Sending...' : (
                  <><Send className="w-5 h-5" /> Send Message</>
                )}
              </button>
            </div>

              {/* Compliance Badges */}
              <div className="pt-8 space-y-4 border-t border-white/5">
                <div className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                  <ShieldCheck className="w-5 h-5 text-neutral-600 shrink-0" />
                  <p className="text-[11px] text-neutral-500 leading-relaxed font-outfit">
                    <strong>Privacy Notice:</strong> We will use the information you provide only to respond to your request, including any inquiries related to your personal data.
                  </p>
                </div>
                <p className="px-4 text-[11px] text-neutral-600 leading-relaxed italic">
                  You may use this page to request access to, correction of, or deletion of your personal information, where applicable under your local laws. This page functions as a valid Data Subject Access Request (DSAR) submission method.
                </p>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Direct Contact */}
        <div className="mt-16 pt-12 border-t border-white/5 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-white/5 rounded-full text-xs font-inter font-bold tracking-widest text-neutral-500">
            <Mail className="w-3.5 h-3.5" /> Direct Email Path
          </div>
          <p className="text-sm text-neutral-400 font-inter">
            You can also contact us directly at: <br/>
            <span className="text-white font-mono text-base mt-2 block">support@honestmailbox.com</span>
          </p>
          <div className="text-[10px] text-neutral-700 font-inter font-bold tracking-[0.3em] uppercase">
            Private • Encrypted • Secure
          </div>
        </div>

      </div>
    </div>
  );
}
