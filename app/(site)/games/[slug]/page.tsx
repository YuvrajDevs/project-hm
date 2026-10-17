import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { childrenOf, getChild } from "@/lib/seo/pages";
import { ChildPage } from "@/components/seo/ChildPage";
import { buildMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return childrenOf("games").map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = getChild("games", slug);
  if (!page) return {};
  return buildMetadata({ title: page.title, description: page.description, path: page.path });
}

export default async function GameChildPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = getChild("games", slug);
  if (!page) notFound();
  return <ChildPage page={page} />;
}
