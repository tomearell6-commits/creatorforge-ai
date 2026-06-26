"use client";

import Script from "next/script";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

/* Minimal Paddle.js v2 typing for what we use. */
declare global {
  interface Window {
    Paddle?: {
      Environment: { set: (env: string) => void };
      Initialize: (opts: { token?: string }) => void;
      Checkout: { open: (opts: Record<string, unknown>) => void };
    };
  }
}

let initialized = false;
function initPaddle() {
  if (initialized || typeof window === "undefined" || !window.Paddle) return;
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  if (!token) return;
  // Sandbox tokens are prefixed "test_"; live tokens "live_".
  window.Paddle.Environment.set(token.startsWith("test_") ? "sandbox" : "production");
  window.Paddle.Initialize({ token });
  initialized = true;
}

/** Loads Paddle.js once. Render a single instance on the billing page. */
export function PaddleScript() {
  return (
    <Script
      src="https://cdn.paddle.com/paddle/v2/paddle.js"
      strategy="afterInteractive"
      onLoad={initPaddle}
    />
  );
}

/** Opens the Paddle overlay checkout for a plan's price, tagging the user. */
export function UpgradeButton({
  priceId,
  planId,
  label,
  userId,
  email,
}: {
  priceId?: string;
  planId: string;
  label: string;
  userId: string;
  email: string;
}) {
  const [msg, setMsg] = useState<string | null>(null);

  function openCheckout() {
    setMsg(null);
    if (!priceId) {
      setMsg("Plan not configured yet.");
      return;
    }
    initPaddle();
    if (!window.Paddle?.Checkout) {
      setMsg("Checkout is still loading — try again in a moment.");
      return;
    }
    window.Paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: email ? { email } : undefined,
      customData: { userId, plan: planId },
      settings: { displayMode: "overlay", theme: "light" },
    });
  }

  return (
    <div className="mt-4 w-full">
      <Button onClick={openCheckout} disabled={!priceId} className="w-full">
        {label}
      </Button>
      {msg && <p className="mt-1 text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}
