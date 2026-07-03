import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = {
  title: "Privacy Policy — CreatorsForge AI",
  description: "How CreatorsForge.io collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" effectiveDate="July 3, 2026">
      <p>
        This Privacy Policy explains how CreatorsForge.io (&quot;CreatorsForge&quot;, &quot;we&quot;) collects,
        uses, and protects personal data when you use our platform.
      </p>

      <h2>1. Data we collect</h2>
      <ul>
        <li><strong>Account data:</strong> email address, name (if provided), authentication identifiers (including Google sign-in identifiers), and hashed credentials.</li>
        <li><strong>Content data:</strong> prompts, projects, uploads, generated outputs, brand kits, and connected-account metadata you create in the service.</li>
        <li><strong>Usage &amp; billing data:</strong> credit balances and usage records, subscription/plan status, payment transaction references (we do <strong>not</strong> store card numbers — payments are handled by our payment processors), and audit/security logs.</li>
        <li><strong>Technical data:</strong> IP address, browser/device information, and cookies strictly needed for authentication and session management.</li>
      </ul>

      <h2>2. How we use data</h2>
      <ul>
        <li>To provide the service: generate content, store projects, meter credits, deliver emails (password resets, notifications, reports).</li>
        <li>To secure the service: rate limiting, fraud and abuse prevention, audit logging, error monitoring.</li>
        <li>To improve the service: aggregate, de-identified usage analysis.</li>
        <li>We do <strong>not</strong> sell your personal data.</li>
      </ul>

      <h2>3. AI processing</h2>
      <p>
        Your prompts and relevant project context are sent to third-party AI providers (for example Anthropic
        for text, fal.ai for images/video, ElevenLabs for voice) to generate the outputs you request. We send
        only what is needed to fulfil your request. These providers process data under their own terms and
        privacy policies and, per their standard API terms, do not use API data to train their models.
      </p>

      <h2>4. Service providers (sub-processors)</h2>
      <p>We use trusted providers to run CreatorsForge, including:</p>
      <ul>
        <li>Supabase (database, authentication, file storage)</li>
        <li>Vercel (hosting and content delivery)</li>
        <li>Anthropic, fal.ai, ElevenLabs, Shotstack, HeyGen, OpenAI (AI generation and media rendering)</li>
        <li>Brevo and Resend (transactional email)</li>
        <li>Payment processors (e.g. NOWPayments for cryptocurrency; card processors when enabled)</li>
        <li>Sentry (error monitoring) and Upstash (rate limiting)</li>
      </ul>

      <h2>5. Cookies</h2>
      <p>
        We use essential cookies for sign-in sessions and security. We do not use third-party advertising
        cookies. Optional analytics, if enabled, are privacy-respecting and aggregate.
      </p>

      <h2>6. Data retention</h2>
      <p>
        Account and content data are retained while your account is active. When you delete content or your
        account, we delete or de-identify associated personal data within a reasonable period, except where we
        must retain records for legal, billing, or security purposes.
      </p>

      <h2>7. Your rights</h2>
      <p>
        Depending on your location (including under GDPR and CCPA), you may have the right to access, correct,
        export, restrict, or delete your personal data, and to object to certain processing. You can delete
        projects and content in-app, or contact us to exercise any right. We will respond within the timeframes
        required by law.
      </p>

      <h2>8. Security</h2>
      <p>
        We use industry-standard measures: encrypted connections (TLS), encryption at rest for sensitive
        tokens, row-level access controls on all user data, audit logging, and least-privilege access. No
        system is 100% secure; report concerns to{" "}
        <a href="mailto:hello@creatorsforge.io" className="text-brand-600 hover:underline">hello@creatorsforge.io</a>.
      </p>

      <h2>9. International transfers</h2>
      <p>
        Our providers may process data in other countries, including the United States. Where required, we rely
        on appropriate safeguards such as standard contractual clauses offered by our sub-processors.
      </p>

      <h2>10. Children</h2>
      <p>The service is not directed to children under 18 and we do not knowingly collect their data.</p>

      <h2>11. Changes &amp; contact</h2>
      <p>
        We may update this policy; material changes will be announced in the app or by email. Contact us at{" "}
        <a href="mailto:hello@creatorsforge.io" className="text-brand-600 hover:underline">hello@creatorsforge.io</a>.
      </p>
    </LegalPage>
  );
}
