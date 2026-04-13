import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Twitter, Globe, MessageSquareHeart } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-300 font-outfit selection:bg-pink-500/30">
      <div className="max-w-2xl mx-auto px-6 py-12 md:py-20">
        
        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="inline-flex items-center gap-2 text-neutral-500 hover:text-white transition-colors uppercase tracking-widest font-bebas text-sm mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back
          </Link>
          <div className="flex items-center gap-3 mb-6">
            <img src="/HM.png" alt="Honest Mailbox Logo" className="w-8 h-auto" />
            <span className="font-bebas text-2xl tracking-[0.2em] text-white uppercase">Honest Mailbox</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bebas tracking-widest uppercase text-white mb-4">Contact & Support</h1>
          <p className="text-sm text-neutral-400 tracking-widest uppercase">We're here to help you connect.</p>
        </div>

        {/* Content */}
        <div className="space-y-8">
          
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <MessageSquareHeart className="w-32 h-32" />
            </div>

            <div className="relative z-10 space-y-6">
              <div>
                <h2 className="text-2xl font-bebas tracking-wider text-white uppercase mb-2">Technical Support</h2>
                <p className="text-sm text-neutral-400 leading-relaxed max-w-md">
                  Having trouble syncing your mailbox? Encountering graphical anomalies? Reach out to our technical engineering division directly.
                </p>
              </div>

              <a 
                href="mailto:support@honestmailbox.com" 
                className="inline-flex items-center gap-3 px-6 py-3 bg-pink-500/10 border border-pink-500/20 text-pink-400 hover:bg-pink-500 hover:text-white rounded-xl transition-all font-bebas tracking-widest uppercase text-lg group"
              >
                <Mail className="w-5 h-5 group-hover:scale-110 transition-transform" />
                support@honestmailbox.com
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
              <h3 className="font-bebas tracking-widest text-white uppercase">Partnerships & Press</h3>
              <p className="text-xs text-neutral-500 max-w-[200px]">
                Interested in evaluating the psychological impact of Honest Mailbox?
              </p>
              <a href="mailto:press@honestmailbox.com" className="text-pink-500 font-bebas uppercase tracking-widest hover:text-pink-400 transition-colors mt-auto">
                press@honestmailbox.com
              </a>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
              <h3 className="font-bebas tracking-widest text-white uppercase">Social Media</h3>
              <p className="text-xs text-neutral-500 max-w-[200px]">
                Follow our development logs and community updates.
              </p>
              <div className="flex items-center gap-4 mt-auto">
                <button className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white">
                  <Twitter className="w-4 h-4" />
                </button>
                <button className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white">
                  <Globe className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-20 pt-8 border-t border-white/5 text-center">
            <p className="text-xs text-neutral-600 font-bebas tracking-[0.2em] uppercase">Private • Encrypted • Just You Two</p>
        </div>

      </div>
    </div>
  );
}
