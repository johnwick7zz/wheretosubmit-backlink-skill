# wheretosubmit-submit

An agent skill that submits your product to the directories and launch sites
listed on [wheretosubmit.org](https://wheretosubmit.org). Your agent picks
targets from your Where To Submit project, fills each site's form in a real
browser from a local product profile, and records progress back to your
account.

It checks for an existing listing before submitting, never pays, never
creates accounts or solves CAPTCHAs unless you allow it, and only marks a site
as submitted after it saw a confirmation.

## What you need

- A Where To Submit account. Reading targets works on every plan; recording
  progress needs Pro.
- An agent with a browser tool. Recommended: ego-browser
  (https://lite.ego.app/, macOS and Windows), which is what we test with: you
  and the agent share one window, so you can watch and take over a CAPTCHA.
  Claude in Chrome, the desktop built-in browser and Playwright MCP work too.
- Optional: a mail tool (Gmail MCP, an IMAP script, or similar) for sites
  that confirm by email.
- Optional: Node 20+ for the profile check script.

## 1. Connect the MCP server

1. Sign in to wheretosubmit.org, open **Account**, find **MCP for AI
   agents**, name a token and click **Generate token**. Copy it; it is shown once.
2. Add the server to your agent. For Claude Code:

   ```
   claude mcp add --transport http wheretosubmit https://wheretosubmit.org/api/mcp --header "Authorization: Bearer wts_..."
   ```

   Or put this in `.mcp.json` at your project root:

   ```json
   {
     "mcpServers": {
       "wheretosubmit": {
         "type": "http",
         "url": "https://wheretosubmit.org/api/mcp",
         "headers": { "Authorization": "Bearer wts_..." }
       }
     }
   }
   ```

Keep the token out of git. The full setup guide, tool list and error codes
are in `docs/mcp.md` in the Where To Submit repository; the Account page shows
the same snippet with your token filled in.

## 2. Install the skill

Claude Code, for all your projects:

```
cp -R wheretosubmit-submit ~/.claude/skills/
```

Or for one project only:

```
mkdir -p .claude/skills && cp -R wheretosubmit-submit .claude/skills/
```

Restart the session so the skill is picked up. Other agents that support
skills: copy the folder where they load skills from, or point the agent at
`SKILL.md`.

## 3. Use it

Ask your agent something like:

- "Submit my product to 10 free directories."
- "Continue my directory submissions."
- "Check my pending badges and email verifications."
- "帮我把产品提交到目录站"

On the first run the agent creates `./.wheretosubmit/` in your project,
drafts `profile.json` from your website, and asks you to confirm the facts.
You can also start from `templates/profile.json` yourself, then check it:

```
node ~/.claude/skills/wheretosubmit-submit/scripts/preflight.mjs --dir ./.wheretosubmit
```

Your product data stays in that folder on your machine. Only the status of
each site (submitted, approved, rejected, unusable, plus a short evidence
note) is sent to wheretosubmit.org.

## Files

```
SKILL.md                         workflow the agent follows
templates/profile.json           product profile template
scripts/preflight.mjs            profile check, no dependencies
scripts/lib/                     helpers for the check
references/profile-schema.md     profile fields and limits
references/field-mapping.md      how forms are filled
references/gates.md              what happens at captchas, paywalls, accounts ...
references/email-verification.md mailbox check and verification emails
references/evidence.md           what counts as proof of a submission
references/complex-sites.md      Product Hunt, G2, Capterra-type outlines
```
