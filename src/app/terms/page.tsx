import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = {
  title: "Terms of Service — CreatorsForge AI",
  description: "The terms that govern your use of CreatorsForge.io.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" effectiveDate="July 3, 2026">
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of CreatorsForge.io
        (&quot;CreatorsForge&quot;, &quot;we&quot;, &quot;us&quot;), an AI-powered content creation platform. By creating an
        account or using the service you agree to these Terms. If you do not agree, do not use the service.
      </p>

      <h2>1. The service</h2>
      <p>
        CreatorsForge provides AI-assisted tools for creating content — including scripts, articles, images,
        designs, voiceovers, videos, marketing assets and related materials — plus publishing, automation and
        analytics features. Features may change, improve, or be discontinued over time.
      </p>

      <h2>2. Accounts</h2>
      <ul>
        <li>You must provide accurate information and keep your credentials secure. You are responsible for all activity under your account.</li>
        <li>You must be at least 18 years old (or the age of majority in your jurisdiction) to use the service.</li>
        <li>We may suspend or terminate accounts that violate these Terms.</li>
      </ul>

      <h2>3. Credits and payment</h2>
      <ul>
        <li>Paid features consume <strong>credits</strong>. Credit costs are shown before each AI generation. Manual editing does not consume credits.</li>
        <li>Subscription plans include a monthly credit allowance; separately purchased credits do not expire. Credits have no cash value and are non-transferable.</li>
        <li>Payments are processed by third-party payment providers. Cryptocurrency payments are confirmed on-chain before credits are granted.</li>
        <li>Refunds are handled per our <a href="/refund-policy" className="text-brand-600 hover:underline">Refund Policy</a>.</li>
      </ul>

      <h2>4. Your content and AI outputs</h2>
      <ul>
        <li><strong>Your inputs:</strong> you retain ownership of the content you upload. You grant us a limited license to process it solely to operate the service.</li>
        <li><strong>AI outputs:</strong> subject to these Terms and applicable third-party model provider terms, we assign to you all our right, title and interest in the AI-generated outputs you create with the service. You are responsible for how you use them.</li>
        <li>AI outputs may be similar to outputs generated for other users, and may contain inaccuracies. Review outputs before relying on or publishing them.</li>
        <li>You are responsible for ensuring your inputs and use of outputs do not infringe third-party rights (copyright, trademark, publicity, privacy).</li>
      </ul>

      <h2>5. Acceptable use</h2>
      <p>You agree not to use the service to:</p>
      <ul>
        <li>create or distribute unlawful, defamatory, harassing, hateful, or sexually exploitative content, or content that harms minors;</li>
        <li>generate deceptive content intended to mislead (including impersonation or fraudulent marketing), or spam;</li>
        <li>infringe intellectual-property rights or copy third-party designs, brands, or works;</li>
        <li>probe, overload, or disrupt the service, circumvent rate limits or credit metering, or resell access without our written consent;</li>
        <li>send unsolicited bulk email through connected integrations in violation of anti-spam laws (e.g. CAN-SPAM, GDPR/PECR).</li>
      </ul>

      <h2>6. Professional-use disclaimer</h2>
      <p>
        CreatorsForge generates <strong>conceptual</strong> design, marketing, and visualization materials.
        Outputs — including floor plan concepts, architectural visuals, and space-planning notes — are for
        planning, marketing, and inspiration only and are <strong>not</strong> certified engineering, CAD,
        construction, legal, financial, or medical documents. Architectural, engineering, legal, and
        construction decisions must be reviewed by qualified professionals before use.
      </p>

      <h2>7. Third-party services</h2>
      <p>
        The service integrates third-party providers (AI models, media rendering, payments, email, publishing
        platforms). Your use of connected third-party accounts (e.g. WordPress, YouTube, social networks) is
        also governed by those platforms&apos; terms. We are not responsible for third-party services.
      </p>

      <h2>8. Intellectual property</h2>
      <p>
        The service, including its software, design, templates, and branding, is owned by CreatorsForge and its
        licensors. Except for the rights expressly granted, no license to our intellectual property is granted.
      </p>

      <h2>9. Disclaimers</h2>
      <p>
        THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
        EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT OUTPUTS WILL BE ACCURATE.
      </p>

      <h2>10. Limitation of liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, CREATORSFORGE WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL,
        SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR LOSS OF PROFITS, DATA, OR GOODWILL. OUR AGGREGATE
        LIABILITY FOR ALL CLAIMS RELATING TO THE SERVICE IS LIMITED TO THE AMOUNTS YOU PAID US IN THE TWELVE
        (12) MONTHS BEFORE THE CLAIM AROSE.
      </p>

      <h2>11. Indemnity</h2>
      <p>
        You will indemnify and hold CreatorsForge harmless from claims arising out of your content, your use of
        outputs, or your breach of these Terms.
      </p>

      <h2>12. Termination</h2>
      <p>
        You may stop using the service and delete your account at any time. We may suspend or terminate access
        for breach of these Terms. Sections 4–11 survive termination. Unused purchased credits are handled per
        the Refund Policy.
      </p>

      <h2>13. Changes</h2>
      <p>
        We may update these Terms. Material changes will be announced in the app or by email; continued use
        after the effective date constitutes acceptance.
      </p>

      <h2>14. Governing law &amp; contact</h2>
      <p>
        These Terms are governed by the laws of the jurisdiction in which the CreatorsForge operating entity is
        established, without regard to conflict-of-law rules. Contact:{" "}
        <a href="mailto:hello@creatorsforge.io" className="text-brand-600 hover:underline">hello@creatorsforge.io</a>.
      </p>
    </LegalPage>
  );
}
