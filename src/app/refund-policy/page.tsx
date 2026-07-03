import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = {
  title: "Refund & Credits Policy — CreatorsForge AI",
  description: "How refunds, credits, and cancellations work on CreatorsForge.io.",
};

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund & Credits Policy" effectiveDate="July 3, 2026">
      <h2>1. Credits</h2>
      <ul>
        <li>Credit costs are always displayed <strong>before</strong> an AI generation runs.</li>
        <li>Credits are only deducted when a real AI generation <strong>succeeds</strong>. Failed generations and free placeholder runs are never charged.</li>
        <li>Subscription credits refresh monthly and do not roll over unless stated otherwise; separately purchased credits never expire.</li>
        <li>Credits have no cash value and cannot be transferred between accounts.</li>
      </ul>

      <h2>2. Refunds for credit purchases</h2>
      <ul>
        <li><strong>Unused credits:</strong> if you purchased a credit pack and have used none of it, contact us within 14 days of purchase for a refund to your original payment method where technically possible.</li>
        <li><strong>Partially used packs:</strong> because AI generation incurs real compute costs immediately, consumed credits are non-refundable. We may, at our discretion, refund the unused portion of a pack.</li>
        <li><strong>Cryptocurrency payments:</strong> on-chain payments are irreversible by nature. Where a refund is approved, it is issued in the original cryptocurrency to a wallet you designate, net of network fees, or as account credit at your choice.</li>
      </ul>

      <h2>3. Subscriptions</h2>
      <ul>
        <li>You can cancel your subscription at any time; access and included credits continue until the end of the current billing period.</li>
        <li>We do not provide pro-rated refunds for partial billing periods, except where required by law.</li>
      </ul>

      <h2>4. Faulty service</h2>
      <p>
        If a platform error caused credits to be deducted without delivering an output, contact us — we will
        re-run the generation or restore the credits. This is our default and preferred remedy.
      </p>

      <h2>5. Quality of AI outputs</h2>
      <p>
        AI generation is inherently variable. A result that is technically delivered but subjectively
        disliked is not a fault; use the built-in re-generate and editing tools. We may issue goodwill credits
        at our discretion.
      </p>

      <h2>6. Chargebacks</h2>
      <p>
        Please contact us before initiating a chargeback — most issues are resolved faster directly. Accounts
        with fraudulent chargebacks may be suspended.
      </p>

      <h2>7. How to request a refund</h2>
      <p>
        Email <a href="mailto:hello@creatorsforge.io" className="text-brand-600 hover:underline">hello@creatorsforge.io</a>{" "}
        from your account email with the transaction reference. We respond within 5 business days.
      </p>

      <h2>8. Statutory rights</h2>
      <p>This policy does not limit any non-waivable rights you have under applicable consumer-protection law.</p>
    </LegalPage>
  );
}
