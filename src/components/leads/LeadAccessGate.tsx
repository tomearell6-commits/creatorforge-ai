"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ComplianceModal } from "./ComplianceModal";

type AccessLevel = "none" | "limited" | "full" | "advanced";

type LeadAccess = {
  plan: string;
  level: AccessLevel;
  verified: boolean;
  paid: boolean;
  featureEnabled: boolean;
  complianceAccepted: boolean;
  senderProfileComplete: boolean;
  limits: { monthlyLeads: number; dailySends: number; automatedSend: boolean };
  usage: { leadsThisMonth: number; sendsToday: number };
};

type Need = "view" | "search" | "send";

type Missing =
  | "verify"
  | "suspended"
  | "upgrade"
  | "monthly_limit"
  | "compliance"
  | "sender_profile"
  | "daily_limit";

/** Mirror of firstBlock() in @/lib/leads/access — the server is still authoritative. */
function firstMissing(a: LeadAccess, need: Need): Missing | null {
  if (!a.verified) return "verify";
  if (!a.featureEnabled) return "suspended";
  if (a.level === "none" || !a.paid) return "upgrade";
  if (need === "view") return null;
  if (need === "search") {
    if (a.usage.leadsThisMonth >= a.limits.monthlyLeads) return "monthly_limit";
    return null;
  }
  if (need === "send") {
    if (!a.limits.automatedSend || a.level === "limited") return "upgrade";
    if (!a.complianceAccepted) return "compliance";
    if (!a.senderProfileComplete) return "sender_profile";
    if (a.usage.sendsToday >= a.limits.dailySends) return "daily_limit";
    return null;
  }
  return null;
}

/**
 * Client access gate for Lead Generator pages. Fetches the user's access state
 * and renders a professional locked card when the requested need isn't met.
 * The server-side guard remains authoritative; this is UX only.
 */
export function LeadAccessGate({ need = "view", children }: { need?: Need; children: ReactNode }) {
  const [access, setAccess] = useState<LeadAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch("/api/leads/access/status");
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setAccess(data.access as LeadAccess);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" label="Checking access…" />
      </div>
    );
  }

  if (failed || !access) {
    return (
      <Card className="text-center">
        <p className="text-sm text-muted-foreground">Could not verify your Lead Generator access.</p>
        <Button variant="outline" className="mt-3" onClick={load}>
          Retry
        </Button>
      </Card>
    );
  }

  const missing = firstMissing(access, need);
  if (!missing) return <>{children}</>;

  const buttons: ReactNode[] = [];
  switch (missing) {
    case "verify":
      buttons.push(
        <Button key="verify" asChild variant="accent">
          <a href="/dashboard/settings">Verify account</a>
        </Button>
      );
      break;
    case "suspended":
      buttons.push(
        <Button key="support" asChild variant="accent">
          <a href="/dashboard/support">Contact support</a>
        </Button>
      );
      break;
    case "upgrade":
      buttons.push(
        <Button key="upgrade" asChild variant="accent">
          <a href="/dashboard/billing">Upgrade Plan</a>
        </Button>,
        <Button key="policy" variant="outline" onClick={() => setModalOpen(true)}>
          View Compliance Policy
        </Button>
      );
      break;
    case "monthly_limit":
      buttons.push(
        <Button key="upgrade" asChild variant="accent">
          <a href="/dashboard/billing">Upgrade Plan</a>
        </Button>,
        <Button key="credits" asChild variant="outline">
          <a href="/dashboard/credits">Top Up Credits</a>
        </Button>
      );
      break;
    case "daily_limit":
      buttons.push(
        <Button key="upgrade" asChild variant="accent">
          <a href="/dashboard/billing">Upgrade Plan</a>
        </Button>,
        <Button key="support" variant="outline" asChild>
          <a href="/dashboard/support">Contact support</a>
        </Button>
      );
      break;
    case "compliance":
      buttons.push(
        <Button key="policy" variant="accent" onClick={() => setModalOpen(true)}>
          View Compliance Policy
        </Button>
      );
      break;
    case "sender_profile":
      buttons.push(
        <Button key="sender" asChild variant="accent">
          <a href="/dashboard/leads/settings">Complete sender profile</a>
        </Button>
      );
      break;
  }

  const subtext =
    missing === "compliance"
      ? "Accept the Lead Generation Compliance Policy before running outreach."
      : missing === "sender_profile"
      ? "Complete your sender profile so every email carries the right identity and unsubscribe details."
      : missing === "monthly_limit"
      ? "You've reached your plan's monthly lead limit. Upgrade or top up to keep discovering leads."
      : missing === "daily_limit"
      ? "You've reached your plan's daily sending limit. It resets tomorrow."
      : missing === "suspended"
      ? "Lead Generator access is currently disabled for your account. Contact support to restore it."
      : missing === "verify"
      ? "Verify your email to unlock verified lead discovery and compliant outreach."
      : "Discover verified business leads from public sources and run compliant, permission-based outreach — all in one place.";

  return (
    <>
      <Card className="mx-auto max-w-2xl text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-900 text-brand-300 dark:bg-brand-950/50 dark:text-brand-300">
          {missing === "compliance" || missing === "sender_profile" ? (
            <ShieldCheck className="h-6 w-6" aria-hidden />
          ) : (
            <Lock className="h-6 w-6" aria-hidden />
          )}
        </div>
        <h2 className="text-xl font-bold">
          Lead Generator is available on Business and Enterprise plans
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{subtext}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">{buttons}</div>
      </Card>

      <ComplianceModal open={modalOpen} onClose={() => setModalOpen(false)} onAccepted={load} />
    </>
  );
}
