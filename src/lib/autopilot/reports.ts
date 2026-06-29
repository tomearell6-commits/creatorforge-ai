/** Autopilot report builder — summarizes jobs over a period. Pure function. */

type JobRow = { status: string; content_type: string; destination: string; credits_used: number; scheduled_time: string | null; published_time: string | null; created_at: string };

export type AutopilotReport = {
  period: "daily" | "weekly" | "monthly";
  from: string; to: string;
  generated: number; published: number; failed: number;
  creditsUsed: number; creditsRemaining: number;
  successRate: number;
  upcoming: { title: string; content_type: string; destination: string; scheduled_time: string }[];
};

const SPAN_DAYS = { daily: 1, weekly: 7, monthly: 30 } as const;

export function buildReport(
  period: "daily" | "weekly" | "monthly",
  jobs: (JobRow & { title?: string | null })[],
  creditsRemaining: number,
): AutopilotReport {
  const now = Date.now();
  const from = new Date(now - SPAN_DAYS[period] * 86_400_000);
  const inWindow = jobs.filter((j) => new Date(j.created_at).getTime() >= from.getTime());

  const generated = inWindow.filter((j) => ["generating", "awaiting_approval", "scheduled", "publishing", "published"].includes(j.status)).length;
  const published = inWindow.filter((j) => j.status === "published").length;
  const failed = inWindow.filter((j) => j.status === "failed").length;
  const creditsUsed = inWindow.reduce((s, j) => s + (j.credits_used ?? 0), 0);
  const attempts = published + failed;

  const upcoming = jobs
    .filter((j) => j.scheduled_time && new Date(j.scheduled_time).getTime() > now && j.status !== "published")
    .sort((a, b) => new Date(a.scheduled_time!).getTime() - new Date(b.scheduled_time!).getTime())
    .slice(0, 10)
    .map((j) => ({ title: j.title ?? "Content", content_type: j.content_type, destination: j.destination, scheduled_time: j.scheduled_time! }));

  return {
    period, from: from.toISOString(), to: new Date(now).toISOString(),
    generated, published, failed, creditsUsed, creditsRemaining,
    successRate: attempts ? Math.round((published / attempts) * 100) : 100,
    upcoming,
  };
}
