"use client";

import React, { useState } from 'react';
import { Mail, Send, CheckCircle2, Copy, Check, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

// Every message is sent from the person's own email app to this address
const CONTACT_EMAIL = 'thehonestmailbox@gmail.com';
const PURPOSES: Record<string, string> = {
  general: 'General support / questions',
  data_request: 'Privacy / data request',
  technical: 'Technical issue',
};

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    purpose: 'general',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'sent'>('idle');
  const [copied, setCopied] = useState(false);
  const [website, setWebsite] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.message.trim()) return;
    // Bots fill every field, including the one people cannot see
    if (website) { setStatus('sent'); return; }
    
    // Opens the person's email app with the message ready to send to our address
    const subject = `[${PURPOSES[formData.purpose] || 'Contact'}] ${formData.name.trim() || formData.email}`;
    const body = `${formData.message.trim()}\n\n--\nName: ${formData.name.trim() || '-'}\nReply to: ${formData.email}`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setStatus('sent');
  };

  return (
    <div className="max-w-2xl mx-auto px-6 pt-4 pb-16">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Contact', href: '/contact' }]} />

      <header className="mt-10 mb-12 space-y-6">
        <h1 className="text-4xl md:text-5xl font-bebas tracking-widest uppercase text-white leading-tight">Contact &amp; Support</h1>
        <div className="bg-[#1c1c1c] border-l-2 border-pink-500/50 p-6 rounded-r-2xl">
          <p className="text-sm text-neutral-300 leading-relaxed font-outfit">
            If you have questions about your account, need help using the app, or want to request access, updates, or deletion of your personal data, you can contact us here.
          </p>
        </div>
      </header>

        <AnimatePresence mode="wait">
          {status === 'sent' ? (
            <motion.div 
              key="sent"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#161616] border border-[#2a2a2a] rounded-[1.5rem] p-12 text-center space-y-6"
            >
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-500">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-bebas tracking-widest uppercase text-white">Almost There</h2>
                <p className="text-sm text-neutral-400 font-outfit leading-relaxed">
                  Your email app should now be open with your message ready. Press send there and we&apos;ll reply to the email you gave us.
                </p>
                <p className="text-xs text-neutral-500 font-outfit leading-relaxed">
                  Nothing opened? Write to us at the address below.
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try { await navigator.clipboard.writeText(CONTACT_EMAIL); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* the address is selectable below */ }
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] px-4 py-3 font-mono text-sm text-white hover:bg-[#242424] active:scale-95 transition-all"
              >
                {CONTACT_EMAIL}
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-neutral-500" />}
              </button>
              <div className="pt-6 border-t border-white/5 text-[10px] text-neutral-600 uppercase tracking-widest">
                Data Protection Protocol Active
              </div>
              <button 
                onClick={() => setStatus('idle')}
                className="text-pink-500 font-bebas uppercase tracking-widest text-sm hover:text-pink-400"
              >
                Write another message
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
              <input
                type="text"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
              />
              <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[10px] font-inter font-bold text-neutral-500 uppercase tracking-widest ml-1">Name (Optional)</label>
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Your name"
                  className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl px-5 py-3.5 text-white focus:outline-none focus:border-white/30 transition-all font-inter text-sm"
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
                  className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl px-5 py-3.5 text-white focus:outline-none focus:border-white/30 transition-all font-inter text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-inter font-bold text-neutral-500 uppercase tracking-widest ml-1">Purpose of Inquiry</label>
              <select 
                value={formData.purpose}
                onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                className="w-full bg-[#151515] border border-white/10 rounded-xl px-5 py-3.5 text-neutral-300 focus:outline-none focus:border-white/30 transition-all font-inter text-sm appearance-none"
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
                maxLength={1500}
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                placeholder="How can we help?"
                className="w-full bg-[#161616] border border-[#2a2a2a] rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:border-white/30 transition-all font-inter text-sm resize-none"
              />
            </div>

            <div className="pt-2">
              <button 
                type="submit"
                className="w-full bg-white text-black font-inter font-bold text-xl py-4 rounded-2xl hover:bg-neutral-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(255,255,255,0.1)]"
              >
                <Send className="w-5 h-5" /> Send Message
              </button>
              <p className="text-[11px] text-neutral-500 font-outfit text-center mt-3 leading-relaxed">This opens your email app with the message ready to send to {CONTACT_EMAIL}.</p>
            </div>

              {/* Compliance Badges */}
              <div className="pt-8 space-y-4 border-t border-white/5">
                <div className="flex gap-4 p-4 rounded-xl bg-[#1c1c1c] border border-[#232323]">
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
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-white font-mono text-base mt-2 block hover:underline">thehonestmailbox@gmail.com</a>
          </p>
          <div className="text-[10px] text-neutral-700 font-inter font-bold tracking-[0.3em] uppercase">
            Private • Just You Two
          </div>
        </div>

    </div>
  );
}
