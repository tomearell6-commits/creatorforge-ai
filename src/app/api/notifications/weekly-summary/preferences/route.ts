import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { limitRequestAsync } from "@/lib/security/ratelimit";

/**
 * Weekly-summary notification preferences.
 * GET -> the user's weekly preference fields (or sane defaults if no row).
 * PUT -> validate + upsert the weekly preference fields.
 */

const WEEKLY_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const DEFAULTS = {
  weekly_summary: true,
  weekly_email: true,
  weekly_inapp: true,
  weekly_day: "monday",
  weekly_time: "09:00",
  weekly_timezone: "UTC",
};

type WeeklyPrefs = typeof DEFAULTS;

function pickWeekly(row: Record<string, unknown> | null): WeeklyPrefs {
  if (!row) return { ...DEFAULTS };
  return {
    weekly_summary: row.weekly_summary ?? DEFAULTS.weekly_summary,
    weekly_email: row.weekly_email ?? DEFAULTS.weekly_email,
    weekly_inapp: row.weekly_inapp ?? DEFAULTS.weekly_inapp,
    weekly_day: (row.weekly_day as string) ?? DEFAULTS.weekly_day,
    weekly_time: (row.weekly_time as string) ?? DEFAULTS.weekly_time,
    weekly_timezone: (row.weekly_timezone as string) ?? DEFAULTS.weekly_timezone,
  } as WeeklyPrefs;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("weekly_summary, weekly_email, weekly_inapp, weekly_day, weekly_time, weekly_timezone")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ preferences: pickWeekly(data) });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await limitRequestAsync(request, "weekly-prefs", 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const update: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() };

  if ("weekly_summary" in body) update.weekly_summary = !!body.weekly_summary;
  if ("weekly_email" in body) update.weekly_email = !!body.weekly_email;
  if ("weekly_inapp" in body) update.weekly_inapp = !!body.weekly_inapp;

  if ("weekly_day" in body) {
    const day = String(body.weekly_day).toLowerCase();
    if (!WEEKLY_DAYS.includes(day)) {
      return NextResponse.json({ error: "Invalid weekly_day." }, { status: 400 });
    }
    update.weekly_day = day;
  }

  if ("weekly_time" in body) {
    const time = String(body.weekly_time);
    if (!TIME_RE.test(time)) {
      return NextResponse.json({ error: "Invalid weekly_time (expected HH:MM)." }, { status: 400 });
    }
    update.weekly_time = time;
  }

  if ("weekly_timezone" in body) {
    const tz = String(body.weekly_timezone);
    if (!tz || tz.length > 64) {
      return NextResponse.json({ error: "Invalid weekly_timezone." }, { status: 400 });
    }
    try {
      new Intl.DateTimeFormat(undefined, { timeZone: tz });
    } catch {
      return NextResponse.json({ error: "Invalid weekly_timezone." }, { status: 400 });
    }
    update.weekly_timezone = tz;
  }

  const { data, error } = await supabase
    .from("notification_preferences")
    .upsert(update, { onConflict: "user_id" })
    .select("weekly_summary, weekly_email, weekly_inapp, weekly_day, weekly_time, weekly_timezone")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ preferences: pickWeekly(data) });
}
