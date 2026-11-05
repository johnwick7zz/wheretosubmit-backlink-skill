# Email verification

Many sites send a code or a magic link before a submission counts. The agent
can only finish these if it can read `contact.email`.

Use whichever mail tool is available in this environment: a Gmail MCP, an
IMAP script, a desktop mail app the agent can see, or a webmail tab in the
browser. The skill does not depend on any one of them.

## Webmail in the browser (default)

The simplest mail tool is the mailbox's own website, open in a tab of the
same browser you submit with. No extra MCP, no IMAP.

1. Pick the webmail: `accounts.mailbox.url` if set; otherwise by the email's
   domain: 163.com → https://mail.163.com, 126.com → https://mail.126.com,
   qq.com → https://mail.qq.com, gmail.com → https://mail.google.com,
   outlook.com / hotmail.com / live.com → https://outlook.live.com. Anything
   else: ask the user for the URL once and save it.
2. Open it in its own tab and sign in with `accounts.mailbox` (falling back to
   `accounts.default`). A QR-only login, a phone code, or a second factor you
   cannot complete: tell the user, let them finish the login in that tab, and
   carry on once the inbox shows.
3. Keep the tab open for the whole run. To check for a message, switch to it,
   refresh the inbox, and use the webmail's search for the site's domain or
   name. Open the message, read the code or copy the link, and go back.
4. Treat the inbox as read-only: no replies, no forwarding, no deleting, no
   settings. Read only the verification messages.
5. If the session drops, sign in again the same way.

## Before the batch: prove the mailbox works

1. Open the webmail tab and sign in (above), or confirm a mail tool reads the
   `contact.email` mailbox. A forwarding alias is fine if forwarded mail lands
   in the mailbox you can read.
2. Look at the newest message's sender, subject and time. Do not report its
   content to anyone.
3. If the newest message is recent (days, not months), the mailbox is live.
4. If you cannot get in, or the account does not match `contact.email`:
   - tell the user,
   - skip email-verify and account sites this run (leave them unmarked),
   - run open-form and captcha-handoff sites only.

## During a submission

Do not sit on one site waiting for mail. Submit, note the time, move on, and
check the mailbox for several sites at once (gates.md, email-verify).

1. Note the time just before you press submit.
2. On the mailbox round, look only at messages received after the noted
   time whose sender domain matches the site, or which clearly name the site
   and the product (some sites send through a mail service). Check spam and
   promotions too. Give a site up to 5 minutes from its submit time before
   counting it as "no email".
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
