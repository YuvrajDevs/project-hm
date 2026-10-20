import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { blogPosts, getBlogPost } from "@/lib/blogs";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { buildMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return blogPosts.map((p) => ({ blogId: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ blogId: string }> }): Promise<Metadata> {
  const { blogId } = await params;
  const post = getBlogPost(blogId);
  if (!post) return {};
  return buildMetadata({ title: post.title, description: post.dek, path: `/blogs/${post.id}` });
}

const stamp = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

// Two devices swap public keys through the server, then each combines its own private key with the
// other's public key to land on the same shared secret — the server only ever handles public halves.
const KeyExchangeDiagram = () => (
  <figure className="my-8">
    <svg viewBox="0 0 560 190" role="img" aria-label="Two devices each generate a private and public key. They exchange public keys through the server, and each device combines its own private key with the other's public key to arrive at the same shared secret. The server only ever sees the public keys." className="w-full h-auto">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
        </marker>
      </defs>
      <text x="80" y="20" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="600">Device A</text>
      <text x="480" y="20" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="600">Device B</text>
      <rect x="30" y="34" width="100" height="40" rx="8" fill="none" stroke="var(--accent-pink)" strokeWidth="1.5" />
      <text x="80" y="58" textAnchor="middle" fontSize="11" fill="var(--accent-pink)">private key</text>
      <rect x="430" y="34" width="100" height="40" rx="8" fill="none" stroke="var(--accent-pink)" strokeWidth="1.5" />
      <text x="480" y="58" textAnchor="middle" fontSize="11" fill="var(--accent-pink)">private key</text>

      <rect x="230" y="86" width="100" height="36" rx="8" fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.2" />
      <text x="280" y="108" textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.7">server (relay only)</text>

      <line x1="130" y1="54" x2="228" y2="95" stroke="var(--accent-blue)" strokeWidth="1.5" markerEnd="url(#arrow)" />
      <line x1="430" y1="54" x2="332" y2="95" stroke="var(--accent-blue)" strokeWidth="1.5" markerEnd="url(#arrow)" />
      <text x="190" y="80" textAnchor="middle" fontSize="9" fill="var(--accent-blue)">public key</text>
      <text x="370" y="80" textAnchor="middle" fontSize="9" fill="var(--accent-blue)">public key</text>

      <line x1="228" y1="104" x2="130" y2="160" stroke="var(--accent-blue)" strokeWidth="1.5" markerEnd="url(#arrow)" />
      <line x1="332" y1="104" x2="430" y2="160" stroke="var(--accent-blue)" strokeWidth="1.5" markerEnd="url(#arrow)" />

      <rect x="30" y="152" width="100" height="32" rx="8" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <text x="80" y="172" textAnchor="middle" fontSize="10" fill="currentColor">shared secret</text>
      <rect x="430" y="152" width="100" height="32" rx="8" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <text x="480" y="172" textAnchor="middle" fontSize="10" fill="currentColor">shared secret</text>
    </svg>
    <figcaption className="text-xs text-neutral-500 font-outfit text-center mt-2">
      Both devices land on the same secret without either private key ever leaving its device.
    </figcaption>
  </figure>
);

// A passphrase-wrapped backup of the private key is the only thing allowed to leave the device that
// generated it; a second device needs the same passphrase to unwrap it before it can decrypt anything.
const BackupDiagram = () => (
  <figure className="my-8">
    <svg viewBox="0 0 560 160" role="img" aria-label="The original device wraps its private key with a passphrase and stores only that encrypted backup on the server. A new device downloads the encrypted backup and uses the same passphrase to unwrap the real private key locally." className="w-full h-auto">
      <defs>
        <marker id="arrow2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
        </marker>
      </defs>
      <text x="80" y="20" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="600">Original device</text>
      <rect x="20" y="34" width="120" height="36" rx="8" fill="none" stroke="var(--accent-pink)" strokeWidth="1.5" />
      <text x="80" y="56" textAnchor="middle" fontSize="10" fill="var(--accent-pink)">private key + passphrase</text>

      <line x1="140" y1="52" x2="230" y2="52" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#arrow2)" />
      <text x="185" y="42" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.7">wraps</text>

      <rect x="230" y="34" width="100" height="36" rx="8" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <text x="280" y="50" textAnchor="middle" fontSize="10" fill="currentColor">encrypted</text>
      <text x="280" y="63" textAnchor="middle" fontSize="10" fill="currentColor">backup</text>

      <line x1="280" y1="70" x2="280" y2="110" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.2" markerEnd="url(#arrow2)" />
      <text x="330" y="94" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.6">stored server-side</text>

      <rect x="230" y="112" width="100" height="36" rx="8" fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.2" />
      <text x="280" y="134" textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.7">server</text>

      <line x1="230" y1="130" x2="140" y2="130" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#arrow2)" />
      <text x="185" y="120" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.7">downloads</text>

      <text x="480" y="20" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="600">New device</text>
      <rect x="420" y="112" width="120" height="36" rx="8" fill="none" stroke="var(--accent-pink)" strokeWidth="1.5" />
      <text x="480" y="134" textAnchor="middle" fontSize="10" fill="var(--accent-pink)">unwraps with passphrase</text>
    </svg>
    <figcaption className="text-xs text-neutral-500 font-outfit text-center mt-2">
      The server only ever holds the encrypted backup — never the key, and never the passphrase.
    </figcaption>
  </figure>
);

export default async function BlogPostPage({ params }: { params: Promise<{ blogId: string }> }) {
  const { blogId } = await params;
  const post = getBlogPost(blogId);
  if (!post) notFound();

  return (
    <article className="max-w-3xl mx-auto px-6 pt-4 pb-16 space-y-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Blog", href: "/blogs" }, { label: post.title, href: `/blogs/${post.id}` }]} />

      <header className="space-y-4">
        <p className="font-bebas text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
          {stamp(post.date)} &middot; {post.readMins} min read
        </p>
        <h1 className="text-3xl md:text-5xl font-bebas tracking-widest text-white uppercase leading-tight">
          {post.title}
        </h1>
        <p className="text-neutral-400 font-outfit text-sm md:text-base leading-relaxed">{post.dek}</p>
      </header>

      <div className="space-y-10">
        {post.sections.map((section) => (
          <section key={section.id} aria-labelledby={`${section.id}-heading`} className="space-y-4">
            <h2 id={`${section.id}-heading`} className="text-xl md:text-2xl font-bebas tracking-widest text-white uppercase">
              {section.heading}
            </h2>
            {section.paragraphs.map((para, i) => (
              <p key={i} className="text-neutral-400 font-outfit text-sm md:text-base leading-relaxed">
                {para}
              </p>
            ))}
            {section.code && (
              <div className="bg-black/40 border border-white/10 rounded-xl p-4 overflow-x-auto">
                <p className="font-outfit text-[10px] tracking-wider text-neutral-500 uppercase mb-2">{section.code.label}</p>
                <pre className="font-mono text-[12.5px] leading-relaxed text-neutral-300 whitespace-pre"><code>{section.code.snippet}</code></pre>
              </div>
            )}
            {section.id === "exchange" && <KeyExchangeDiagram />}
            {section.id === "multidevice" && <BackupDiagram />}
          </section>
        ))}
      </div>
    </article>
  );
}
