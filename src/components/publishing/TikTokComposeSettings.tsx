"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { BrandIcon } from "@/components/icons/BrandIcon";
import type { TikTokPostOptions } from "@/lib/publishing/types";

/**
 * TikTok Direct-Post compliance panel. Shown in the Publish drawer when TikTok
 * is a chosen destination. Implements TikTok's required UX: shows who you're
 * posting as, forces a privacy choice from the account's allowed options,
 * exposes the interaction + commercial-disclosure controls, and surfaces the
 * mandatory consent statements. Reports validity up so the parent can gate the
 * Publish button.
 */

type CreatorInfo = {
  ok: boolean;
  error?: string;
  username?: string | null;
  nickname?: string | null;
  options?: string[];
  commentDisabled?: boolean;
  duetDisabled?: boolean;
  stitchDisabled?: boolean;
};

const PRIVACY_LABELS: Record<string, string> = {
  PUBLIC_TO_EVERYONE: "Public — everyone",
  MUTUAL_FOLLOW_FRIENDS: "Friends — mutual follows",
  FOLLOWER_OF_CREATOR: "Followers",
  SELF_ONLY: "Only me (private)",
};

export function TikTokComposeSettings({
  onChange,
}: {
  onChange: (options: TikTokPostOptions | null, valid: boolean) => void;
}) {
  const [info, setInfo] = useState<CreatorInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [privacy, setPrivacy] = useState("");
  const [allowComment, setAllowComment] = useState(true);
  const [allowDuet, setAllowDuet] = useState(true);
  const [allowStitch, setAllowStitch] = useState(true);
  const [commercial, setCommercial] = useState(false);
  const [yourBrand, setYourBrand] = useState(false);
  const [brandedContent, setBrandedContent] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch("/api/social/tiktok/creator-info")
      .then((r) => r.json())
      .then((d: CreatorInfo) => { if (alive) setInfo(d); })
      .catch(() => { if (alive) setInfo({ ok: false, error: "Couldn't load your TikTok account." }); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  // Branded (paid-partnership) content can't be private.
  const options = (info?.options ?? []).filter((o) => !(brandedContent && o === "SELF_ONLY"));
  useEffect(() => {
    if (brandedContent && privacy === "SELF_ONLY") setPrivacy("");
  }, [brandedContent, privacy]);

  // Push options + validity to the parent whenever anything changes.
  useEffect(() => {
    const valid =
      !!info?.ok &&
      !!privacy &&
      (!commercial || yourBrand || brandedContent) &&
      !(brandedContent && privacy === "SELF_ONLY");
    onChange(
      privacy
        ? {
            privacyLevel: privacy,
            disableComment: !allowComment || !!info?.commentDisabled,
            disableDuet: !allowDuet || !!info?.duetDisabled,
            disableStitch: !allowStitch || !!info?.stitchDisabled,
            commercialContent: commercial,
            yourBrand: commercial && yourBrand,
            brandedContent: commercial && brandedContent,
          }
        : null,
      valid,
    );
  }, [info, privacy, allowComment, allowDuet, allowStitch, commercial, yourBrand, brandedContent, onChange]);

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        <BrandIcon platform="tiktok" className="h-4 w-4" />
        <p className="text-xs font-semibold">TikTok post settings</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner className="h-4 w-4" /> Loading your TikTok account…</div>
      ) : !info?.ok ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">{info?.error ?? "Couldn't load your TikTok account."}</p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Posting as <span className="font-semibold text-foreground">{info.nickname || (info.username ? `@${info.username}` : "your TikTok account")}</span>
          </p>

          {/* Privacy — required */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Who can view this video <span className="text-red-500">*</span></label>
            <select value={privacy} onChange={(e) => setPrivacy(e.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
              <option value="">Select…</option>
              {options.map((o) => <option key={o} value={o}>{PRIVACY_LABELS[o] ?? o}</option>)}
            </select>
          </div>

          {/* Interaction toggles */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground">Allow users to</p>
            <label className={`flex items-center gap-2 text-sm ${info.commentDisabled ? "opacity-50" : ""}`}>
              <input type="checkbox" className="h-4 w-4" checked={allowComment && !info.commentDisabled} disabled={info.commentDisabled} onChange={(e) => setAllowComment(e.target.checked)} />
              Comment{info.commentDisabled ? " (disabled on your account)" : ""}
            </label>
            <label className={`flex items-center gap-2 text-sm ${info.duetDisabled ? "opacity-50" : ""}`}>
              <input type="checkbox" className="h-4 w-4" checked={allowDuet && !info.duetDisabled} disabled={info.duetDisabled} onChange={(e) => setAllowDuet(e.target.checked)} />
              Duet{info.duetDisabled ? " (disabled on your account)" : ""}
            </label>
            <label className={`flex items-center gap-2 text-sm ${info.stitchDisabled ? "opacity-50" : ""}`}>
              <input type="checkbox" className="h-4 w-4" checked={allowStitch && !info.stitchDisabled} disabled={info.stitchDisabled} onChange={(e) => setAllowStitch(e.target.checked)} />
              Stitch{info.stitchDisabled ? " (disabled on your account)" : ""}
            </label>
          </div>

          {/* Commercial content disclosure */}
          <div className="space-y-1.5 border-t border-border pt-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" className="h-4 w-4" checked={commercial} onChange={(e) => setCommercial(e.target.checked)} />
              Disclose video content
            </label>
            <p className="text-[11px] text-muted-foreground">Turn on if this video promotes a brand, product, or service.</p>
            {commercial && (
              <div className="space-y-1.5 pl-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4" checked={yourBrand} onChange={(e) => setYourBrand(e.target.checked)} />
                  Your brand — promoting yourself or your own business
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4" checked={brandedContent} onChange={(e) => setBrandedContent(e.target.checked)} />
                  Branded content — a paid partnership with another brand
                </label>
                {commercial && !yourBrand && !brandedContent && (
                  <p className="text-[11px] text-amber-600">Pick at least one so TikTok can label it correctly.</p>
                )}
                {(yourBrand || brandedContent) && (
                  <p className="text-[11px] text-muted-foreground">
                    Your video will be labelled &ldquo;{brandedContent ? "Paid partnership" : "Promotional content"}&rdquo;.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Required consent statements */}
          <p className="border-t border-border pt-2 text-[11px] text-muted-foreground">
            By posting, you agree to TikTok&rsquo;s{" "}
            {brandedContent && <>
              <a href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noreferrer" className="underline">Branded Content Policy</a>{" and "}
            </>}
            <a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer" className="underline">Music Usage Confirmation</a>.
          </p>
        </>
      )}
    </div>
  );
}
