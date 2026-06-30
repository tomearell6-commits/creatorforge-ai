import { notFound } from "next/navigation";
import { STUDIOS, getStudio } from "@/config/studios";
import { StudioHub } from "@/components/dashboard/StudioHub";
import { getWalletSummary } from "@/lib/credits/wallet";

export function generateStaticParams() {
  return STUDIOS.map((s) => ({ slug: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const studio = getStudio(slug);
  return { title: studio ? `${studio.title} — CreatorForge AI` : "Studio — CreatorForge AI" };
}

export default async function StudioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const studio = getStudio(slug);
  if (!studio) notFound();

  const wallet = await getWalletSummary().catch(() => null);
  return <StudioHub studio={studio} creditsRemaining={wallet?.creditsRemaining ?? null} planName={wallet?.planName} />;
}
