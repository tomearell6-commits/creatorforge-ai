"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { cn } from "@/lib/utils";

type Prefs = {
  email_credit: boolean;
  email_subscription: boolean;
  email_payment: boolean;
  inapp_credit: boolean;
  inapp_subscription: boolean;
};

const DEFAULT_PREFS: Prefs = {
  email_credit: true,
  email_subscription: true,
  email_payment: true,
  inapp_credit: true,
  inapp_subscription: true,
};

type Row = {
  key: keyof Prefs;
  label: string;
  desc: string;
  disabled?: boolean;
  note?: string;
};

const ROWS: Row[] = [
  { key: "email_credit", label: "Email credit alerts", desc: "Get emailed when your credits run low." },
  { key: "email_subscription", label: "Email subscription alerts", desc: "Renewal and plan-change emails." },
  {
    key: "email_payment",
    label: "Email payment alerts",
    desc: "Failed charges and security notices.",
    disabled: true,
    note: "Payment & security alerts can't be turned off.",
  },
  { key: "inapp_credit", label: "In-app credit alerts", desc: "Low-credit banners inside the app." },
  { key: "inapp_subscription", label: "In-app subscription alerts", desc: "Renewal reminders inside the app." },
];

/** Toggle switch styled to the CreatorsForge design system. */
function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        checked ? "bg-brand-500" : "bg-muted",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

/** User notification preferences card (email + in-app + weekly summary). */
export function NotificationPreferences() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/notifications/preferences");
        if (!res.ok) throw new Error();
        const json = await res.json().catch(() => ({}));
        const p = (json.preferences ?? json.prefs ?? json) as Partial<Prefs>;
        if (active) setPrefs({ ...DEFAULT_PREFS, ...p, email_payment: true });
      } catch {
        if (active) setError("Couldn't load your notification preferences.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function update(key: keyof Prefs, value: boolean) {
    if (!prefs) return;
    // email_payment is forced on and never editable.
    if (key === "email_payment") return;

    const next: Prefs = { ...prefs, [key]: value, email_payment: true };
    setPrefs(next);
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Couldn't save that change. Please try again.");
      setPrefs(prefs); // revert
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Choose which alerts you receive by email and in-app.</CardDescription>
        </div>
        <div className="flex h-6 items-center text-xs text-muted-foreground" aria-live="polite">
          {saving && <Spinner size="sm" />}
          {!saving && saved && (
            <span className="inline-flex items-center gap-1 text-brand-700 dark:text-brand-400">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner size="lg" label="Loading preferences" />
        </div>
      ) : prefs ? (
        <div className="divide-y divide-border/60">
          {ROWS.map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{row.label}</p>
                <p className="text-xs text-muted-foreground">{row.desc}</p>
                {row.note && <p className="mt-0.5 text-xs text-muted-foreground/80">{row.note}</p>}
              </div>
              <Toggle
                label={row.label}
                checked={prefs[row.key]}
                disabled={row.disabled}
                onChange={(v) => update(row.key, v)}
              />
            </div>
          ))}
        </div>
      ) : null}

      <div className="border-t border-border/60 pt-4">
        <WeeklySummaryPreferences />
      </div>
    </Card>
  );
}

type WeeklyPrefs = {
  weekly_summary: boolean;
  weekly_email: boolean;
  weekly_inapp: boolean;
  weekly_day: string;
  weekly_time: string;
  weekly_timezone: string;
};

const DEFAULT_WEEKLY: WeeklyPrefs = {
  weekly_summary: false,
  weekly_email: true,
  weekly_inapp: true,
  weekly_day: "monday",
  weekly_time: "09:00",
  weekly_timezone: "UTC",
};

const DAYS = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Africa/Lagos",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Australia/Sydney",
];

const selectClass =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500";

/** Weekly summary schedule + delivery preferences (separate endpoint). */
function WeeklySummaryPreferences() {
  const [prefs, setPrefs] = useState<WeeklyPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/notifications/weekly-summary/preferences");
        if (!res.ok) throw new Error();
        const json = (await res.json().catch(() => ({}))) as Partial<WeeklyPrefs>;
        if (active) setPrefs({ ...DEFAULT_WEEKLY, ...json });
      } catch {
        if (active) setError("Couldn't load your weekly summary settings.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function update<K extends keyof WeeklyPrefs>(key: K, value: WeeklyPrefs[K]) {
    if (!prefs) return;
    const prev = prefs;
    const next: WeeklyPrefs = { ...prefs, [key]: value };
    setPrefs(next);
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/notifications/weekly-summary/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Couldn't save that change. Please try again.");
      setPrefs(prev); // revert
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Weekly summary</p>
          <p className="text-xs text-muted-foreground">
            A weekly digest of your credits, content, publishing, and automation activity.
          </p>
        </div>
        <div className="flex h-6 items-center text-xs text-muted-foreground" aria-live="polite">
          {saving && <Spinner size="sm" />}
          {!saving && saved && (
            <span className="inline-flex items-center gap-1 text-brand-700 dark:text-brand-400">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner size="md" label="Loading weekly summary settings" />
        </div>
      ) : prefs ? (
        <div className="space-y-4">
          <div className="divide-y divide-border/60">
            <div className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">Send me a weekly summary</p>
                <p className="text-xs text-muted-foreground">Master switch for the weekly digest.</p>
              </div>
              <Toggle
                label="Send me a weekly summary"
                checked={prefs.weekly_summary}
                onChange={(v) => update("weekly_summary", v)}
              />
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">Email delivery</p>
                <p className="text-xs text-muted-foreground">Receive the summary by email.</p>
              </div>
              <Toggle
                label="Weekly summary email"
                checked={prefs.weekly_email}
                disabled={!prefs.weekly_summary}
                onChange={(v) => update("weekly_email", v)}
              />
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">In-app delivery</p>
                <p className="text-xs text-muted-foreground">Show the summary inside the app.</p>
              </div>
              <Toggle
                label="Weekly summary in-app"
                checked={prefs.weekly_inapp}
                disabled={!prefs.weekly_summary}
                onChange={(v) => update("weekly_inapp", v)}
              />
            </div>
          </div>

          <div
            className={cn(
              "grid gap-4 sm:grid-cols-3",
              !prefs.weekly_summary && "opacity-60"
            )}
          >
            <div>
              <Label htmlFor="weekly-day">Day</Label>
              <select
                id="weekly-day"
                className={selectClass}
                value={prefs.weekly_day}
                disabled={!prefs.weekly_summary}
                onChange={(e) => update("weekly_day", e.target.value)}
              >
                {DAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="weekly-time">Time</Label>
              <Input
                id="weekly-time"
                type="time"
                value={prefs.weekly_time}
                disabled={!prefs.weekly_summary}
                onChange={(e) => update("weekly_time", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="weekly-timezone">Timezone</Label>
              <select
                id="weekly-timezone"
                className={selectClass}
                value={prefs.weekly_timezone}
                disabled={!prefs.weekly_summary}
                onChange={(e) => update("weekly_timezone", e.target.value)}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
