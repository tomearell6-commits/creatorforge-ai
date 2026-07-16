import { Bot, User, Sparkles, Compass, GraduationCap, Wallet } from "lucide-react";
import { Reveal } from "./Reveal";

const CHAT = [
  { from: "user", text: "How do I create a YouTube Short?" },
  { from: "bot", text: "Open the Content Studio → AI Video. Describe your topic, pick the Short format, and I'll draft the script, voice, and scenes. Want me to start one now?" },
  { from: "user", text: "How many credits will that use?" },
  { from: "bot", text: "A 30-second Short is about 80 credits with rendering. You have plenty — want me to open the editor?" },
];

const CAPABILITIES = [
  { icon: Compass, label: "Guided onboarding" },
  { icon: GraduationCap, label: "Step-by-step tutorials" },
  { icon: Sparkles, label: "Workflow recommendations" },
  { icon: Wallet, label: "Credit awareness" },
];

export function AssistantDemo() {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2">
      <Reveal>
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-brand-700">Forge AI Assistant</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink dark:text-foreground sm:text-4xl">
            Your AI guide across every Studio
          </h2>
          <p className="mt-4 max-w-md text-ink-soft dark:text-muted-foreground">
            A floating assistant that understands where you are, recommends the next step, launches guided tours, and always knows your credit balance.
          </p>
          <ul className="mt-6 grid grid-cols-2 gap-3">
            {CAPABILITIES.map((c) => {
              const Icon = c.icon;
              return (
                <li key={c.label} className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Icon className="h-4 w-4 text-brand-600" /> {c.label}
                </li>
              );
            })}
          </ul>
        </div>
      </Reveal>

      <Reveal delay={120}>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-lg">
          <div className="mb-3 flex items-center gap-2 border-b border-border pb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white"><Bot className="h-5 w-5" /></span>
            <div>
              <p className="text-sm font-semibold">Forge Assistant</p>
              <p className="flex items-center gap-1 text-xs text-brand-600"><span className="h-2 w-2 rounded-full bg-brand-600" /> Online</p>
            </div>
          </div>
          <div className="space-y-3">
            {CHAT.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.from === "user" ? "flex-row-reverse" : ""}`}>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${m.from === "user" ? "bg-muted text-foreground" : "bg-brand-100 text-brand-900 dark:bg-brand-950/50 dark:text-brand-300"}`}>
                  {m.from === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </span>
                <p className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.from === "user" ? "bg-brand-600 text-white" : "bg-muted text-foreground"}`}>{m.text}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  );
}
