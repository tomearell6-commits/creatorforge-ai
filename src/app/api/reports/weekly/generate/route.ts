import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildWeeklyReport, weekRange, mondayUtc } from "@/lib/reports/weekly";
import { limitRequestAsync } from "@/lib/security/ratelimit";

const MAX_SPAN_MS = 92 * 86400000;

/**
 * POST /api/reports/weekly/generate
 * Builds a live, UNSAVED weekly report for a requested window.
 * Body: { range?: "this"|"last"|"4weeks"|"custom", start?, end? }
 *   this    -> current in-progress week (Monday..now)
 *   last    -> most recently completed week (default)
 *   4weeks  -> the last 4 completed weeks
 *   custom  -> start/end ISO dates (valid, start<end, span <= 92 days)
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await limitRequestAsync(request, "weekly-generate", 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });

  let body: { range?: string; start?: string; end?: string } = {};
  try {
    body = await request.json();
  } catch {
    // Empty/invalid body -> defaults.
  }

  const range = body.range ?? "last";
  let start: Date;
  let end: Date;

  if (range === "this") {
    start = mondayUtc(new Date());
    end = new Date();
  } else if (range === "4weeks") {
    start = weekRange(3).start;
    end = weekRange(0).end;
  } else if (range === "custom") {
    if (!body.start || !body.end) {
      return NextResponse.json({ error: "start and end are required for a custom range." }, { status: 400 });
    }
    start = new Date(body.start);
    end = new Date(body.end);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Invalid start or end date." }, { status: 400 });
    }
    if (start.getTime() >= end.getTime()) {
      return NextResponse.json({ error: "start must be before end." }, { status: 400 });
    }
    if (end.getTime() - start.getTime() > MAX_SPAN_MS) {
      return NextResponse.json({ error: "Range too large (max 92 days)." }, { status: 400 });
    }
  } else {
    // "last" and any unknown value default to the most recent completed week.
    const wr = weekRange(0);
    start = wr.start;
    end = wr.end;
  }

  const report = await buildWeeklyReport(supabase, user.id, start, end);
  return NextResponse.json({ report });
}
