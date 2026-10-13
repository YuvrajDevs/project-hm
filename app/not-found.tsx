import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-[2.5rem] p-8 text-center space-y-6">
        <img src="/logo.png" alt="" className="w-12 h-auto mx-auto" />
        <div className="space-y-2">
          <h1 className="text-3xl font-bebas tracking-widest uppercase">Page Not Found</h1>
          <p className="text-neutral-400 font-outfit text-sm leading-relaxed">
            This link doesn&apos;t lead anywhere. If it was an invite, ask your partner to send it again.
          </p>
        </div>
        <Link
          href="/"
          className="block w-full bg-white text-black font-bebas tracking-widest uppercase rounded-2xl py-4 hover:bg-neutral-200 active:scale-95 transition-all"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
