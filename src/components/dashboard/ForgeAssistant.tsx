"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Sparkles, X, Minus, Send, Coins, Loader2, ThumbsUp, ThumbsDown } from "lucide-react";

type Msg = { id?: string; role: "user" | "assistant"; content: string; cost?: number; failed?: boolean };

const QUICK_ACTIONS = [
  "Create my first video", "Generate SEO article", "Connect WordPress", "Connect social account",
  "Top up credits", "Explain my plan", "How do I publish content?", "Which tool should I use?",
];

const WELCOME = "Hi! I'm Forge AI Assistant 👋 I can guide you step by step — creating videos, SEO articles, product ads, connecting WordPress or social accounts, rendering, publishing, and how credits work. What would you like to do?";

const PAGE_LABELS: [RegExp, string][] = [
  [/\/dashboard\/credits/, "Credit Wallet"], [/\/dashboard\/billing/, "Billing"],
  [/\/dashboard\/seo/, "AI SEO Studio"], [/\/dashboard\/render/, "Render Queue"],
  [/\/dashboard\/social/, "Social Accounts"], [/\/dashboard\/calendar/, "Publishing Calendar"],
  [/\/dashboard\/create/, "Create Content"], [/\/dashboard\/projects/, "Projects"],
  [/\/dashboard\/voice/, "AI Audio & Music Studio"], [/\/dashboard\/thumbnails/, "AI Image Studio"],
  [/\/dashboard$/, "Dashboard home"],
];
function pageLabel(path: string): string {
  return PAGE_LABELS.find(([re]) => re.test(path))?.[1] ?? "Dashboard";
}

export function ForgeAssistant() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: WELCOME }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [allowance, setAllowance] = useState<{ remaining: number; limit: number; lowCreditThreshold: number } | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [estCost, setEstCost] = useState<{ credits: number; willCharge: boolean; realAI: boolean } | null>(null);
  const [needCredits, setNeedCredits] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Only render inside the dashboard.
  const inDashboard = pathname?.startsWith("/dashboard");

  useEffect(() => {
    if (!open) return;
    fetch("/api/assistant/free-allowance").then((r) => r.json()).then((d) => setAllowance({ remaining: d.remaining, limit: d.limit, lowCreditThreshold: d.lowCreditThreshold }));
    fetch("/api/wallet").then((r) => r.ok ? r.json() : null).then((d) => d && setCredits(d.creditsRemaining));
  }, [open]);

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages, busy]);

  // Let other components (e.g. the onboarding card) open the assistant.
  useEffect(() => {
    const handler = () => { setOpen(true); setMin(false); };
    window.addEventListener("open-forge-assistant", handler);
    return () => window.removeEventListener("open-forge-assistant", handler);
  }, []);

  // Debounced cost estimate as the user types.
  useEffect(() => {
    if (!input.trim()) { setEstCost(null); return; }
    const id = setTimeout(async () => {
      const r = await fetch("/api/assistant/estimate-cost", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: input }) });
      if (r.ok) setEstCost(await r.json());
    }, 400);
    return () => clearTimeout(id);
  }, [input]);

  const noCreditsLeft = allowance?.remaining === 0 && estCost?.willCharge && credits != null && credits < (estCost?.credits ?? 1);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || busy) return;
    setNeedCredits(false);
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setInput("");
    setBusy(true);
    try {
      const r = await fetch("/api/assistant/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, conversationId, page: pageLabel(pathname ?? ""), category: new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("category") ?? undefined }),
      });
      const d = await r.json();
      if (r.status === 402) { setNeedCredits(true); setMessages((m) => [...m, { role: "assistant", content: "You need more credits to continue chatting with Forge AI Assistant.", failed: true }]); return; }
      if (!r.ok) { setMessages((m) => [...m, { role: "assistant", content: d.error || "Something went wrong. No credits were charged.", failed: true }]); return; }
      setConversationId(d.conversationId);
      setMessages((m) => [...m, { id: d.messageId, role: "assistant", content: d.reply, cost: d.creditCost }]);
      if (typeof d.freeRemaining === "number") setAllowance((a) => a ? { ...a, remaining: d.freeRemaining } : a);
      if (typeof d.creditsRemaining === "number") setCredits(d.creditsRemaining);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Network error. No credits were charged — please try again.", failed: true }]);
    } finally { setBusy(false); }
  }

  async function feedback(rating: "up" | "down") {
    await fetch("/api/assistant/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId, rating }) });
  }

  if (!inDashboard) return null;

  if (!open) {
    return (
      <button onClick={() => { setOpen(true); setMin(false); }}
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-brand-300 px-4 py-3 font-semibold text-brand-900 shadow-lg transition-transform hover:scale-105 hover:bg-brand-400">
        <Sparkles className="h-5 w-5" /> Ask Forge AI
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between bg-brand-600 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          <div><p className="text-sm font-semibold leading-tight">Forge AI Assistant</p><p className="text-xs text-white/80">Your CreatorForge guide</p></div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMin(!min)} className="rounded p-1 hover:bg-white/20" title="Minimize"><Minus className="h-4 w-4" /></button>
          <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-white/20" title="Close"><X className="h-4 w-4" /></button>
        </div>
      </div>

      {!min && (
        <>
          {/* Messages */}
          <div ref={scrollRef} className="max-h-[50vh] min-h-[280px] space-y-3 overflow-y-auto bg-background p-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user" ? "bg-brand-600 text-white" : m.failed ? "bg-amber-50 text-amber-800" : "bg-muted text-foreground"}`}>
                  {m.content}
                  {m.role === "assistant" && !m.failed && i === messages.length - 1 && i > 0 && (
                    <div className="mt-1.5 flex items-center gap-2 text-muted-foreground">
                      <button onClick={() => feedback("up")} title="Helpful"><ThumbsUp className="h-3.5 w-3.5 hover:text-brand-600" /></button>
                      <button onClick={() => feedback("down")} title="Not helpful"><ThumbsDown className="h-3.5 w-3.5 hover:text-red-500" /></button>
                      {m.cost ? <span className="ml-auto text-[11px]">{m.cost} credit{m.cost === 1 ? "" : "s"}</span> : null}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && <div className="flex justify-start"><div className="rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /></div></div>}

            {/* Quick actions (only before the first user message) */}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {QUICK_ACTIONS.map((q) => (
                  <button key={q} onClick={() => send(q)} className="rounded-full border border-border bg-card px-2.5 py-1 text-xs hover:bg-muted">{q}</button>
                ))}
              </div>
            )}
          </div>

          {/* Credit indicator */}
          <div className="border-t border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
            {allowance && allowance.remaining > 0 && estCost?.realAI !== false ? (
              <span>Free assistant messages remaining: <b>{allowance.remaining}</b></span>
            ) : estCost?.realAI === false ? (
              <span>Assistant help is free in preview mode.</span>
            ) : (
              <span className="flex items-center gap-1"><Coins className="h-3.5 w-3.5" /> Estimated cost: <b>{estCost?.credits ?? 1} credit{(estCost?.credits ?? 1) === 1 ? "" : "s"}</b>
                {credits != null && <span className="ml-auto">Credits: <b>{credits.toLocaleString()}</b></span>}</span>
            )}
            {credits != null && allowance && credits <= allowance.lowCreditThreshold && allowance.remaining === 0 && !needCredits && (
              <div className="mt-1 text-amber-700">Low credits. <Link href="/dashboard/credits" className="underline">Top up</Link> to continue using the assistant.</div>
            )}
          </div>

          {/* Need credits state */}
          {(needCredits || noCreditsLeft) && (
            <div className="border-t border-border bg-amber-50 px-3 py-2 text-xs text-amber-800">
              You need more credits to continue chatting with Forge AI Assistant.
              <Link href="/dashboard/credits" className="ml-2 inline-block rounded-md bg-brand-300 px-2 py-1 font-semibold text-brand-900">Top Up Credits</Link>
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-border bg-card p-2">
            <input
              value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send(input))}
              placeholder="Ask Forge AI…" disabled={busy || needCredits || !!noCreditsLeft}
              className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60"
            />
            <button onClick={() => send(input)} disabled={busy || !input.trim() || needCredits || !!noCreditsLeft}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-50">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
