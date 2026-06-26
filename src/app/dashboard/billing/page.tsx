import { Check, CreditCard, Bitcoin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { PLANS } from "@/lib/constants";
import { PaddleScript, UpgradeButton } from "@/components/dashboard/PaddleCheckout";
import { CryptoButton } from "@/components/dashboard/CryptoButton";

export const metadata = { title: "Billing — CreatorForge AI" };

// Plan → Paddle Price ID (from env). Undefined until configured.
const PRICE_IDS: Record<string, string | undefined> = {
  creator: process.env.NEXT_PUBLIC_PADDLE_PRICE_CREATOR,
  pro: process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO,
  agency: process.env.NEXT_PUBLIC_PADDLE_PRICE_AGENCY,
};

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let currentPlan = "free";
  let credits = 0;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, credits")
      .eq("user_id", user.id)
      .single();
    currentPlan = profile?.plan ?? "free";
    credits = profile?.credits ?? 0;
  }

  // Paddle stays hidden until card verification is approved — flip
  // NEXT_PUBLIC_ENABLE_PADDLE=true to turn it on. Crypto (NOWPayments) is always available.
  const paddleEnabled = process.env.NEXT_PUBLIC_ENABLE_PADDLE === "true";

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {paddleEnabled && <PaddleScript />}
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="mt-1 text-muted-foreground">Manage your plan and credits.</p>
      </div>

      <Card className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <CardDescription>Current plan</CardDescription>
          <p className="mt-1 text-2xl font-bold capitalize">{currentPlan}</p>
        </div>
        <div>
          <CardDescription>Credits remaining</CardDescription>
          <p className="mt-1 text-2xl font-bold">{credits}</p>
        </div>
      </Card>

      {/* Payment methods */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2">
            <Bitcoin className="h-5 w-5 text-brand-600" />
            <CardTitle>Crypto</CardTitle>
          </div>
          <CardDescription className="mt-2">
            Pay with crypto via NOWPayments — use the crypto option on any plan below.
          </CardDescription>
        </Card>
        <Card>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Card / Paddle</CardTitle>
          </div>
          <CardDescription className="mt-2">
            {paddleEnabled
              ? "Subscribe by card via Paddle — pick a plan below and check out securely."
              : "Card payments are coming soon (pending Paddle verification). Crypto is available now."}
          </CardDescription>
        </Card>
      </div>

      {/* Plans */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Available plans</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            return (
              <Card
                key={plan.id}
                className={cn("flex flex-col", plan.highlighted && "border-brand-600")}
              >
                <h3 className="font-bold">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold">${plan.price}</span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                </div>
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button variant="secondary" className="mt-4 w-full" disabled>
                    Current plan
                  </Button>
                ) : plan.price === 0 ? (
                  <Button variant="outline" className="mt-4 w-full" disabled>
                    Free
                  </Button>
                ) : (
                  <>
                    {paddleEnabled && (
                      <UpgradeButton
                        priceId={PRICE_IDS[plan.id]}
                        planId={plan.id}
                        label={`Upgrade to ${plan.name}`}
                        userId={user?.id ?? ""}
                        email={user?.email ?? ""}
                      />
                    )}
                    <CryptoButton planId={plan.id} label={`Subscribe — $${plan.price}/mo in crypto`} />
                  </>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
