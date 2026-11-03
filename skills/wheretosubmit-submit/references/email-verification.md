# Email verification

Many sites send a code or a magic link before a submission counts. The agent
can only finish these if it can read `contact.email`.

Use whichever mail tool is available in this environment: a Gmail MCP, an
IMAP script, a desktop mail app the agent can see, or a webmail tab in the
browser. The skill does not depend on any one of them.

## Before the batch: prove the mailbox works

1. Find a mail tool that reads the `contact.email` mailbox. A forwarding
   alias is fine if forwarded mail lands in the mailbox you can read.
2. Search for the newest message in that mailbox and read its sender,
   subject and time. Do not report its content to anyone.
3. If the newest message is recent (days, not months), the mailbox is live.
4. If you cannot read it, or the account does not match `contact.email`:
   - tell the user,
   - skip email-verify and account sites this run (leave them unmarked),
   - run open-form and captcha-handoff sites only.

## During a submission

1. Note the time just before you press submit.
2. After the page says "check your email", poll the mailbox:
   - every 20 to 30 seconds,
   - for up to 5 minutes,
   - only messages received after the noted time,
   - sender domain matches the site's domain, or the email clearly names the
     site and the product (some sites send through a mail service with a
     different domain),
   - also look in spam, promotions and "all mail".
3. Code: type it into the site's form.
4. Magic link: open it in the same browser session that submitted the form.
   Tracking redirects are fine if you land on the site's own domain. If the
   link goes to an unrelated domain, do not open it; tell the user.
5. Read the page after verifying and treat it like any other confirmation
   (evidence.md).

## If nothing arrives

1. Do not submit again; a second submission often creates a duplicate or
   gets the product flagged.
2. Mark `submitted` with `followup: "verify_email"` only if the page itself
   confirmed the form ("we sent you an email"). Evidence: `Check: <submit or
   status page url>`, the page text and "no email within 5 minutes". Never
   the emailed link.
3. Move on to the next site.

## On a later run

1. Call `project_status` with `followup: "verify_email"`.
2. For each site, search the mailbox for messages from that site since the
   mark's `updatedAt`.
3. Found and the link still works: verify, then mark `submitted` again with
   `followup: "awaiting_review"` (or none) and full evidence.
4. Link expired: tell the user. Do not resubmit without their OK.
5. Nothing found after a few days: tell the user; the mark stays.

## Safety

- Never write codes or links into `evidence`, chat summaries or files.
- Never forward, reply to or delete emails.
- Only open links in emails that come from the site you just submitted to.
- Read only what you need: the verification messages. Do not browse the
  user's inbox.
