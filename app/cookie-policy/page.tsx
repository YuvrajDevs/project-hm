import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-300 font-outfit selection:bg-pink-500/30">
      <div className="max-w-3xl mx-auto px-6 py-12 md:py-20">
        
        {/* Header */}
        <div className="mb-16">
          <Link href="/" className="inline-flex items-center gap-2 text-neutral-500 hover:text-white transition-colors uppercase tracking-widest font-bebas text-sm mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back
          </Link>
          <div className="flex items-center gap-3 mb-6">
            <img src="/HM.png" alt="Honest Mailbox Logo" className="w-8 h-auto" />
            <span className="font-bebas text-2xl tracking-[0.2em] text-white uppercase">Honest Mailbox</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bebas tracking-widest uppercase text-white mb-4">Cookie Policy</h1>
          <p className="text-sm text-neutral-500 tracking-widest uppercase mb-8">Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>

        {/* Content */}
        <div className="space-y-12 leading-relaxed">
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bebas tracking-wider text-white uppercase">1. Introduction</h2>
            <p>
              This Cookie Policy explains how Honest Mailbox utilizes cookies and similar tracking technologies when you use our application. Since our platform is built as a highly restricted, secure space strictly for intimate couple connections, our use of cookies is fundamentally minimal and purely operational.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bebas tracking-wider text-white uppercase">2. What are Cookies?</h2>
            <p>
              Cookies are minor text files stored directly on your computer or mobile device when you access websites or applications. They are universally used to maintain session states, process sign-ins, and remember critical application preferences efficiently.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bebas tracking-wider text-white uppercase">3. How We Use Cookies</h2>
            <p>
              Honest Mailbox only utilizes strictly necessary cookies. We do <strong>not</strong> use invasive third-party tracking cookies or advertising cookies. 
            </p>
            <div className="space-y-4 pl-4 border-l border-white/10 mt-4">
              <div>
                <h3 className="font-bold text-white mb-1">Authentication (Strictly Necessary)</h3>
                <p className="text-sm text-neutral-400">Our native infrastructure relies on Firebase Authentication to explicitly manage your session. Essential tokens are stored locally on your device specifically to keep you securely signed in to your mailbox without repetitive credential prompts.</p>
              </div>
              <div>
                <h3 className="font-bold text-white mb-1">Security & Integrity</h3>
                <p className="text-sm text-neutral-400">Underlying security cookies are leveraged to preemptively identify malicious activities and ensure your localized connection to the server is securely authenticated against unwanted interception.</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bebas tracking-wider text-white uppercase">4. Third-Party Integration</h2>
            <p>
              The application uses Google Authentication to handle account initialization. Accordingly, Google may set fundamental cookies to facilitate the authentication handshake. These actions are strictly governed by Google's overarching privacy policies. Honest Mailbox does not integrate cross-site marketing trackers whatsoever.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bebas tracking-wider text-white uppercase">5. Managing Cookies</h2>
            <p>
              You maintain full authority directly through your browser settings to restrict, reject, or purge all cookies. However, please note that specifically rejecting authentication cookies will abruptly prevent Honest Mailbox from functioning, as the system will be unable to establish or securely sustain your login session.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bebas tracking-wider text-white uppercase">6. Policy Updates</h2>
            <p>
              We reserve the exclusive right to modify this Cookie Policy to map future operational prerequisites. Any updates will be securely appended to this portal, maintaining structural transparency.
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-20 pt-8 border-t border-white/5 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
                <img src="/HM.png" alt="HM Logo" className="w-4 h-auto opacity-50" />
            </div>
            <p className="text-xs text-neutral-600 font-bebas tracking-[0.2em] uppercase">Private • Encrypted • Just You Two</p>
        </div>

      </div>
    </div>
  );
}
