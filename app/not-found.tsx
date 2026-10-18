import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--page)] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-[#161616] border border-[#2a2a2a] rounded-[1.5rem] p-8 text-center space-y-6">
        <img src="/mascot.webp" alt="" className="w-12 h-auto mx-auto" />
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
