import type { Metadata } from "next";
import { getPillar } from "@/lib/seo/pages";
import { PillarPage } from "@/components/seo/PillarPage";
import { buildMetadata } from "@/lib/seo";

const page = getPillar("conflict-resolution")!;

export const metadata: Metadata = buildMetadata({
  title: page.title,
  description: page.description,
  path: page.path,
});

export default function ConflictResolutionPillarPage() {
  return <PillarPage page={page} />;
}
