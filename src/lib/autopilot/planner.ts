/**
 * AI planning engine. Turns a campaign's goals/frequency/content-types into an
 * editable content queue spread across the next `days`. Deterministic + pure so
 * the plan can be previewed and edited before anything is generated/published.
 */
import { AUTOPILOT_FREQUENCIES, AUTOPILOT_CONTENT_TYPES, autopilotContentType } from "@/lib/constants";
import type { Campaign, JobSpec } from "./types";

function perWeek(frequency: string): number {
  return AUTOPILOT_FREQUENCIES.find((f) => f.id === frequency)?.perWeek ?? 3;
}

function destinationFor(contentType: string, campaign: Campaign): string {
  const def = autopilotContentType(contentType).destination;
  if (campaign.destinations.includes(def)) return def;
  return campaign.destinations[0] ?? def;
}

function titleFor(contentType: string, campaign: Campaign, n: number): string {
  const label = AUTOPILOT_CONTENT_TYPES.find((c) => c.id === contentType)?.label ?? "Content";
  const brand = campaign.name || "Your brand";
  return `${label} for ${brand} #${n}`;
}

/** Generate an editable plan of jobs for the next `days` days. */
export function generatePlan(campaign: Campaign, days = 14): JobSpec[] {
  const types = (campaign.content_types.length ? campaign.content_types : AUTOPILOT_CONTENT_TYPES.map((c) => c.id))
    .filter((t) => AUTOPILOT_CONTENT_TYPES.some((c) => c.id === t));
  if (types.length === 0) return [];

  const windows = campaign.publish_windows.length ? campaign.publish_windows : ["09:00"];
  const totalSlots = Math.max(1, Math.round((perWeek(campaign.frequency) / 7) * days));

  const jobs: JobSpec[] = [];
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const stepDays = Math.max(1, Math.floor(days / totalSlots));

  for (let i = 0; i < totalSlots; i++) {
    const contentType = types[i % types.length];
    const win = windows[i % windows.length];
    const [h, m] = win.split(":").map((x) => parseInt(x, 10) || 0);
    const when = new Date(start);
    when.setUTCDate(when.getUTCDate() + 1 + i * stepDays);
    when.setUTCHours(h, m, 0, 0);
    jobs.push({
      title: titleFor(contentType, campaign, i + 1),
      content_type: contentType,
      destination: destinationFor(contentType, campaign),
      scheduled_time: when.toISOString(),
      estimated_credits: autopilotContentType(contentType).credits,
    });
  }
  return jobs;
}

/** Total estimated credits for a set of job specs. */
export function estimatePlanCredits(jobs: JobSpec[]): number {
  return jobs.reduce((sum, j) => sum + j.estimated_credits, 0);
}
