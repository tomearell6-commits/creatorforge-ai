# Gmail OAuth Production Verification — CreatorsForge Email Assistant

This is the end-to-end playbook to take the Email Assistant's Google (Gmail /
Workspace) integration from **Testing** to **In production** so any user can
connect their inbox without the 7-day token expiry and 100-user cap.

**Why this is a project, not a form:** the assistant reads inbox content
(`gmail.readonly`), which Google classifies as a **restricted** scope. Restricted
scopes require, in addition to normal brand verification, an independent
**CASA (Cloud Application Security Assessment)** — a paid, third-party security
review renewed annually. Budget **4–8 weeks** end-to-end and a recurring
**~$540–$4,000/yr** for the assessment.

---

## Scopes we request (and their tiers)

| Scope | Tier | Used by | Purpose |
|---|---|---|---|
| `https://www.googleapis.com/auth/gmail.readonly` | **Restricted** | `listMessages()` | Read inbox to classify, summarize, flag attention, draft replies |
| `https://www.googleapis.com/auth/gmail.send` | Sensitive | `sendReply()` | Send a reply **only after explicit user approval** |
| `openid`, `email` | — | account resolution | Identify which Google account is connected |

Source of truth: `src/lib/email-assistant/providers.ts` (`GOOGLE_SCOPES`).

---

## Phase 0 — Prerequisites (get these green before submitting)

- [x] **Privacy policy** with Google "Limited Use" disclosure — live at
      `https://www.creatorsforge.io/privacy` (section 4). ✅ Added.
- [x] **Terms of service** — live at `https://www.creatorsforge.io/terms`.
- [ ] **Homepage** accurately describes the app and is on the same verified
      domain — `https://www.creatorsforge.io` (already live).
- [ ] **Domain ownership verified** in Google Search Console for
      `creatorsforge.io` (Google reuses this list; the console will only let you
      add "authorized domains" you've verified).
- [ ] **App logo** — square PNG, ≥120×120, no rounded corners baked in.
- [ ] **Support email** on a domain you control (e.g. `hello@creatorsforge.io`).

> The privacy-policy link, the homepage, and every redirect URI must all be on
> `creatorsforge.io`. Mismatched domains are the #2 rejection reason after the
> missing Limited Use text.

---

## Phase 1 — Google Cloud project + OAuth client

1. **console.cloud.google.com** → create a project (e.g. `creatorsforge-prod`)
   or reuse one. Keep it dedicated to production.
2. **APIs & Services → Library** → enable **Gmail API**.
3. **APIs & Services → OAuth consent screen**:
   - User type: **External**
   - App name: **CreatorsForge**, support email, app logo
   - **App domain**: homepage `https://www.creatorsforge.io`,
     privacy `https://www.creatorsforge.io/privacy`,
     terms `https://www.creatorsforge.io/terms`
   - **Authorized domains**: `creatorsforge.io`
   - Developer contact email
4. **Scopes** → Add the three above (`gmail.readonly`, `gmail.send`, plus
   `openid`/`email`). `gmail.readonly` will show a "restricted" badge.
5. **Credentials → Create credentials → OAuth client ID**:
   - Type: **Web application**
   - **Authorized redirect URI** (exactly, no trailing slash):
     `https://www.creatorsforge.io/api/email/callback`
   - (Optional, for local testing) `http://localhost:3000/api/email/callback`
6. Copy the **Client ID** and **Client secret** into Vercel → Project → Settings
   → Environment Variables:
   - `GMAIL_CLIENT_ID`
   - `GMAIL_CLIENT_SECRET`
   Then **redeploy**. The Email Assistant's Google option activates automatically
   (`isGoogleEmailConfigured()`), no code change needed.

> **Test first, verify second.** While in "Testing" status, add yourself under
> **Test users** and connect a Gmail account end-to-end. Confirm the inbox loads,
> a draft generates, and an approved reply sends. Only submit for verification
> once the real flow works — reviewers will run exactly this flow.

---

## Phase 2 — Scope justifications (paste into the verification form)

Google asks, per scope, *why* you need it and *why a narrower scope won't do*.
Be specific and tie each to a user-visible feature. Suggested text:

**`gmail.readonly`**
> CreatorsForge is an AI Email Assistant. When a user connects their Gmail, we
> read their inbox messages to (1) classify each message by type and urgency,
> (2) surface a "needs attention" list, (3) generate summaries, and (4) prepare
> draft replies the user can review. We only read messages; we never modify or
> delete them, so `gmail.readonly` is the narrowest scope that supports these
> read-and-summarize features. Metadata-only scopes are insufficient because
> classification and draft generation require message body content.

**`gmail.send`**
> After a user reviews and explicitly approves an AI-drafted reply in our UI, we
> send it from their account. Nothing is sent automatically by default; sensitive
> categories can never auto-send. `gmail.send` is the minimal scope for sending
> and does not grant read or modify access, matching our least-privilege design.

**Limited Use affirmation** (they will look for this):
> Our use of Google user data complies with the Google API Services User Data
> Policy, including the Limited Use requirements. Gmail data is used solely to
> provide user-facing Email Assistant features, is never sold, is never used for
> advertising, and is never used to train generalized AI/ML models.

---

## Phase 3 — Demo video (required for restricted scopes)

Record an unlisted YouTube video (2–4 min) showing:
1. The OAuth consent screen with the **project name visible** in the URL/screen.
2. The full grant flow: user clicks "Connect Gmail" in CreatorsForge →
   Google consent → redirect back → inbox loads.
3. Each requested scope **in action**: reading/classifying the inbox
   (`gmail.readonly`), then approving and sending a reply (`gmail.send`).
4. Where the privacy policy is linked in the app.

Narrate what data is accessed and how it maps to each scope. Put the video URL
in the verification form.

---

## Phase 4 — CASA security assessment (the long pole)

Restricted scopes require a **CASA Tier 2** assessment by a Google-recognized
independent assessor. Google emails you a link to start after the brand review.

1. Pick an assessor from Google's list (e.g. TAC Security "ESOF", Bishop Fox,
   Leviathan, DEKRA). TAC's self-service scan is typically the cheapest entry
   point (~$540/yr) for Tier 2.
2. Provide app details, run the automated scan against the app, and remediate
   any findings (TLS, auth, data-handling, dependency CVEs).
3. The assessor issues a **Letter of Assessment (LoA)** / verification you upload
   back to Google.
4. Google completes verification; the consent screen publishing status flips to
   **In production** and the "unverified app" warning disappears.

Renew annually before expiry or the app reverts to unverified.

---

## Fast-path checklist

```
[ ] Search Console: verify creatorsforge.io
[ ] GCP: enable Gmail API
[ ] Consent screen: External, domain + privacy + terms URLs, logo
[ ] Add scopes: gmail.readonly, gmail.send, openid, email
[ ] Create Web OAuth client, redirect https://www.creatorsforge.io/api/email/callback
[ ] Vercel: GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET → redeploy
[ ] Add self as test user → full connect/draft/send test passes
[ ] Record demo video (unlisted YouTube)
[ ] Submit for verification with scope justifications
[ ] Complete CASA Tier 2 assessment → upload LoA
[ ] Publishing status → In production
```

---

## Interim: staying usable before verification clears

While verification is pending, the app stays fully functional in **Testing**
mode for you and any Google accounts you add as **test users** (up to 100).
Everyone else can still use the **Demo inbox** (clearly-flagged sample data) and
the Microsoft/Outlook provider if configured. No code changes are needed when
verification completes — the same client ID simply stops showing the unverified
warning.
