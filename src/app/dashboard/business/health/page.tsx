import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buildHealthReport } from "@/lib/business/health";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const metadata = { title: "Business Health Score — CreatorsForge AI" };

export default async function BusinessHealthPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const report = await buildHealthReport(user.id);
  const color = report.score >= 80 ? "text-brand-600" : report.score >= 60 ? "text-amber-500" : "text-red-500";

  return (
    <div className="space-y-6">
      <Card className="text-center">
        <CardDescription>Business Health Score</CardDescription>
        <p className={`text-6xl font-extrabold ${color}`}>{report.score}</p>
        <Badge variant={report.grade === "A" ? "success" : report.grade === "B" ? "brand" : "warning"}>Grade {report.grade}</Badge>
        <p className="mt-2 text-xs text-muted-foreground">
          Deterministic score over your real account data — every point is explainable below.
        </p>
      </Card>

      <Card>
        <CardTitle>Score breakdown</CardTitle>
        <ul className="mt-4 space-y-3">
          {report.factors.map((f) => (
            <li key={f.id}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{f.label}</span>
                <span className="text-muted-foreground">{f.score} / {f.max}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${f.score / f.max >= 0.7 ? "bg-brand-600" : f.score / f.max >= 0.4 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${(f.score / f.max) * 100}%` }}
                />
              </div>
              {f.advice && <p className="mt-0.5 text-xs text-amber-600">{f.advice}</p>}
            </li>
          ))}
        </ul>
      </Card>

      {report.recommendations.length > 0 && (
        <Card>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-600" />
            <CardTitle>How to improve</CardTitle>
          </div>
          <ol className="mt-3 list-inside list-decimal space-y-1.5 text-sm">
            {report.recommendations.map((r) => <li key={r}>{r}</li>)}
          </ol>
        </Card>
      )}
    </div>
  );
}
