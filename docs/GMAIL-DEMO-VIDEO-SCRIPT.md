# Gmail OAuth Verification — Demo Video Script

A ready-to-record, word-for-word narration for the demo video Google requires
for restricted-scope (`gmail.readonly`) verification. Target length **2–4 min**.
Record your screen, read the narration aloud, do each on-screen action.

**Before you record — checklist**
- [ ] Log in to `www.creatorsforge.io` with your Google **test-user** account.
- [ ] Have a real Gmail inbox with a few messages ready to connect.
- [ ] Screen recorder ready (Windows: press **Win + Alt + R** for the Game Bar
      recorder, or use Loom). Record at 1080p if possible.
- [ ] Close unrelated tabs; no personal/sensitive info visible.
- [ ] Speak clearly; it's fine to pause the recording between scenes.

> **Critical requirement:** Google must be able to see your **OAuth Client ID**
> in the video. The easiest way: during the consent screen (Scene 4), the
> browser URL bar contains `client_id=...`. Make sure the **URL bar is visible**
> and readable for a couple of seconds. (Backup: briefly show Google Cloud
> Console → Clients with the client ID on screen at the start.)

---

## Scene 1 — App intro (~20 sec)
**On screen:** the CreatorsForge.io homepage.

**Say:**
> "Hi, this is a demo of CreatorsForge.io — an AI business platform at
> creators-forge dot io. This video shows our Gmail integration, called the
> Email Assistant, and exactly how it uses the two Gmail scopes we're
> requesting: read-only access to read and classify inbox messages, and send
> access to send replies that the user has reviewed and approved."

---

## Scene 2 — Privacy policy & Limited Use (~15 sec)
**On screen:** navigate to `www.creatorsforge.io/privacy`, scroll to section 4
"Google user data (Gmail) and Limited Use."

**Say:**
> "Our privacy policy is public at creators-forge dot io slash privacy. Section
> four describes exactly what Gmail data we access and how we handle it, and
> states that our use of Google user data complies with the Google API Services
> User Data Policy, including the Limited Use requirements."

---

## Scene 3 — Start the connection (~20 sec)
**On screen:** go to `/dashboard/email/connect`. Show the permission-mode
options; select **"Draft Assistant"**. Click **"Connect Gmail."**

**Say:**
> "Inside the app, the user opens the Email Assistant and chooses a permission
> mode. I'll pick 'Draft Assistant,' which prepares replies but never sends
> without approval. Now I click 'Connect Gmail' to begin Google's OAuth flow."

---

## Scene 4 — Google consent screen (~30 sec)  ⚠️ show the URL bar
**On screen:** the Google account chooser, then the consent screen showing the
app name **"CreatorsForge"** and the requested permissions. **Keep the browser
URL bar visible** (it contains your `client_id`). Then click **Continue / Allow**.

**Say:**
> "Google now shows the consent screen for our app, CreatorsForge. You can see
> our OAuth client ID here in the address bar. Google asks the user to grant two
> permissions: first, to view their email messages and settings — that's the
> read-only scope we use to classify and summarize the inbox. Second, to send
> email on their behalf — used only for replies the user explicitly approves.
> The user reviews these and clicks Allow."

*(Note: while unverified, you'll see an "unverified app" screen — click
"Advanced" then "Go to CreatorsForge." Reviewers expect this during testing.)*

---

## Scene 5 — `gmail.readonly` in action (~35 sec)
**On screen:** the redirect back to the app; the inbox loads. Show messages with
their AI **categories** and **priority** labels; open the **"Needs Attention"**
view.

**Say:**
> "After granting access, we're redirected back into CreatorsForge and the
> user's inbox loads. This is the read-only scope in action: we read each
> message and use AI to classify it by type and urgency, then surface a 'Needs
> Attention' list and summaries. We only read messages — we never modify or
> delete them. Message data is used solely to power these features, is never
> sold, never used for advertising, and never used to train AI models."

---

## Scene 6 — `gmail.send` in action (~35 sec)
**On screen:** open a message, click to **generate an AI draft reply**, show the
draft, then click **Approve / Send**. Show the confirmation that it sent.

**Say:**
> "Now the send scope. The user opens a message and the assistant drafts a
> reply. Nothing is sent automatically — the user reads the draft, edits if they
> want, and only then approves it. When I click send, CreatorsForge sends that
> approved reply from the user's Gmail account. Sensitive topics like billing or
> security can never be auto-sent under any setting."

---

## Scene 7 — Data control & close (~20 sec)
**On screen:** go to the Email Assistant **Settings**; show the **Disconnect**
and **Delete data** options.

**Say:**
> "Finally, the user stays in control. From settings they can disconnect their
> Google account or delete their data at any time, which removes our stored
> tokens immediately. That's the full flow: connect, read and classify with the
> read-only scope, and send approved replies with the send scope — all under the
> Limited Use requirements. Thank you for reviewing CreatorsForge."

---

## After recording
1. Upload to **YouTube** and set visibility to **Unlisted** (not Private — the
   reviewer must be able to open the link; not Public — no need).
2. Copy the video URL.
3. In Google Cloud Console → **Verification Center**, start/continue the
   verification and paste the video URL where it asks for the demonstration.
4. Paste the scope justifications from `docs/GMAIL-OAUTH-VERIFICATION.md`
   (Phase 2) into the "why do you need this scope" fields.
5. Submit. Google will review branding, then route you to the **CASA** security
   assessment for the restricted scope (see Phase 4 of the verification doc).
