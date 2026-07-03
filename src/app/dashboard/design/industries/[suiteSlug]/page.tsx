import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getSuiteBySlug } from "@/config/industrySuites";
import { RealEstateSuite } from "@/components/design/industries/RealEstateSuite";

export const metadata = { title: "Industry Suite — CreatorsForge AI" };

export default async function SuitePage({ params }: { params: Promise<{ suiteSlug: string }> }) {
  const { suiteSlug } = await params;
  const suite = getSuiteBySlug(suiteSlug);

  if (!suite) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="text-center">
          <h1 className="text-xl font-bold">Suite not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">That industry suite is not available. Browse all suites in the hub.</p>
          <Button asChild className="mt-4"><Link href="/dashboard/design/industries">← Industry Suites</Link></Button>
        </Card>
      </div>
    );
  }

  if (suite.status !== "active") {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link href="/dashboard/design/industries" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Industry Suites
        </Link>
        <Card className="text-center">
          <h1 className="text-xl font-bold">{suite.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{suite.description}</p>
          <p className="mt-3 inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">Coming soon</p>
          <p className="mt-3 text-xs text-muted-foreground">
            This suite is on the roadmap. Meanwhile, the general Design Studio covers most needs.
          </p>
          <Button asChild className="mt-4"><Link href="/dashboard/design">Open Design Studio</Link></Button>
        </Card>
      </div>
    );
  }

  // Real Estate & Architecture is the first active suite.
  return (
    <div className="space-y-4">
      <Link href="/dashboard/design/industries" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Industry Suites
      </Link>
      <RealEstateSuite />
    </div>
  );
}
