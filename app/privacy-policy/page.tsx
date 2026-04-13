import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
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
          <h1 className="text-4xl md:text-5xl font-bebas tracking-widest uppercase text-white mb-4">Privacy Policy</h1>
          <p className="text-sm text-neutral-500 tracking-widest uppercase mb-8">Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>

        {/* Content */}
        <div className="space-y-12 leading-relaxed">
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bebas tracking-wider text-white uppercase">1. Introduction</h2>
            <p>
              Welcome to Honest Mailbox. We are committed to protecting your personal information and your right to privacy. This Privacy Policy outlines how we collect, use, and protect your data when you use the Honest Mailbox application and associated services.
            </p>
            <p>
              Because Honest Mailbox is a private space designed for intimate, honest connections between partners, we take data security and transparency extremely seriously. We do not sell your personal data.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bebas tracking-wider text-white uppercase">2. Information We Collect</h2>
            <div className="space-y-4 pl-4 border-l border-white/10">
              <div>
                <h3 className="font-bold text-white mb-1">Account & Authentication Data</h3>
                <p className="text-sm text-neutral-400">When you sign in, we collect your authentication proxy information, including your name, email address, and profile picture to establish your identity and connect you securely with your partner.</p>
              </div>
              <div>
                <h3 className="font-bold text-white mb-1">User Content</h3>
                <p className="text-sm text-neutral-400">All data generated within the application, including messages, daily check-ins, safe space sessions, text interactions, and user preferences, are securely collected strictly to facilitate the functional pairing between you and your partner.</p>
              </div>
              <div>
                <h3 className="font-bold text-white mb-1">Usage Data</h3>
                <p className="text-sm text-neutral-400">We automatically collect limited diagnostic baseline information, such as IP addresses, browser types, and standard application usage analytics to maintain optimal security and platform stability.</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bebas tracking-wider text-white uppercase">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2 text-neutral-400">
              <li>To facilitate connection and message synchronization between your account and your partnered account.</li>
              <li>To manage your account infrastructure status and provide primary network support.</li>
              <li>To inform you of relevant updates, security alerts, and system notifications.</li>
              <li>To ensure the technical stability, fidelity, and security of our platform infrastructure.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bebas tracking-wider text-white uppercase">4. Data Sharing & Disclosure</h2>
            <p>
                The fundamental architecture of Honest Mailbox ensures that your intimate data is restricted heavily. Your user-generated content (messages, check-ins, safe space logs) is exclusively transmitted to your explicitly paired partner.
            </p>
            <p>
                We do not share, sell, rent, or trade your private information with third parties for their promotional or computational purposes. We may only disclose your data if legally necessitated by prevailing laws, or to respond to valid legal summons or governmental compliance requests.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bebas tracking-wider text-white uppercase">5. Security of Your Data</h2>
            <p>
                We utilize industry-standard, robust security measures including secured authentication environments, modernized database access-control rules, and encrypted transmission channels (HTTPS/SSL) to protect your personal information from unauthorized digital access, alteration, or destruction. However, please be comprehensively aware that no method of transmission over the internet or electronic data storage is completely infallible.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bebas tracking-wider text-white uppercase">6. Account & Data Deletion</h2>
            <p>
                You retain complete jurisdiction over your account trajectory. At any arbitrary point, you may initiate an uncoupling process to permanently purge your relational link to your partner. If you formally wish to delete your entire account construct and purge your history completely from our active databases, you may utilize the application settings or contact our support frameworks to initiate a comprehensive removal protocol.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bebas tracking-wider text-white uppercase">7. Modifications to this Policy</h2>
            <p>
              We reserve the exclusive right to continually modify or replace this Privacy Policy at our discretion to reflect fundamental product shifts. The updated version will be denoted accurately by an updated "Last Updated" timestamp and will remain clearly visible on this primary policy portal.
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
