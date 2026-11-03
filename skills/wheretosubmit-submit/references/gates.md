# Gates

A gate is what stands between you and a submitted listing. `get_site`
returns a `gate` value (or `null` when the site was never classified), but
sites change. Always classify the page you actually see, and trust the page
over the record.

A site can have several gates (an account and a captcha). Handle the most
costly one first: paid, then personal-contact, then account, then reciprocal,
then email-verify, then captcha.

## How to classify a page

Look at the submit page and its last step:

| You see | Gate |
| --- | --- |
| A form with a URL field and a submit button, no login | open-form |
| "We'll email you a link / code to confirm" | email-verify |
| A login or sign-up wall, or a form that creates an account on submit | account |
| A visible challenge: image grid, puzzle, typed letters, "I'm not a robot" box | captcha |
| "Add our badge / link back to us before we review" | reciprocal |
| A price on the only path to a listing, or checkout on the last step | paid |
| Required phone, street address, company registration, tax id | personal-contact |
| Anything else: contact page only, email-only submission, broken form | unknown |

Invisible checks (Cloudflare Turnstile that passes by itself, reCAPTCHA v3)
are not a captcha gate. Carry on unless a visible challenge appears.

## open-form

1. Map and fill the form (field-mapping.md).
2. Submit, read the result, take the screenshot.
3. Mark `submitted` with the confirmation text. Add `followup:
   "awaiting_review"` when the site says it reviews submissions.

## email-verify

Only if the mailbox check passed at the start of the run.

1. Note the time, then submit.
2. Follow email-verification.md to find the code or link and complete it.
3. Confirmed: mark `submitted` with `Check: <url>` and what the page and
   email said.
4. Page confirmed the form but no email came: mark `submitted` with
   `followup: "verify_email"` and the evidence "Check: <submit or status
   url>. page said check email, no email within N minutes".
5. Mailbox not readable: skip the site, leave it unmarked, list it in the report.

## account

`allowRegistration` false (default):

1. If the browser is already signed in to the site as the user, you may use
   that session. Say so in the report.
2. Otherwise do not sign up and do not use "Sign in with Google" or similar.
   Leave the site unmarked and list it under "needs your account" in the
   report, with the sign-up URL.

`allowRegistration` true:

1. Prefer sign-in methods that need no new password, such as an existing
   Google session the user already has in this browser, and only with the
   account matching `contact.email`.
2. If a password is needed, ask the user to type it into the browser. Never
   create, store or write down a password yourself.
3. Account verification emails follow email-verification.md.
4. Then continue as open-form.

A form that silently creates an account on submit ("we created an account
for you") counts as account. Check the page text near the submit button
before clicking.

## captcha

Never solve, click through, or bypass a visible captcha. Never use a
captcha-solving service.

`allowCaptchaHandoff` true (default):

1. Fill every other field and stop with the captcha on screen. Do not click
   the final submit.
2. Keep that tab open. Open the next site in a new tab.
3. Tell the user right away: site name, tab, "solve the captcha and press
   Submit, then tell me". If the user is away, collect these and list them
   together at a natural break.
4. When the user says it's done, look at the tab, read the result, and mark
   as usual. If the user says they submitted but the page shows no result, use
   the "user reports" evidence wording from evidence.md.

`allowCaptchaHandoff` false: skip the site, leave it unmarked, list it.

## reciprocal (badge or backlink)

The site wants a badge or link on the product site before it lists you.

1. Do not edit the user's website. That is their decision.
2. If the site lets you submit first: submit, then mark `submitted` with
   `followup: "badge"`. Evidence: `Check: <url>`, then the exact snippet (or
   a pointer to `evidence/<domain>-badge.html`) and where it must go
   ("homepage footer").
3. If the site checks for the badge before accepting the form: copy the
   snippet and placement, leave the site unmarked, and list it in the report
   under "badges to add". On the next run, once the badge is live, submit.
4. At the end of the run, list every badge the user has to embed.

## paid

`allowPaid` false (default):

1. Look for a real free path first: a "free" or "standard" tier, a free queue
   (even a slow one), a "skip" link on the upsell step.
2. Free path exists: use it. Note in the evidence if the free queue is slow
   or the site says free listings are rarely reviewed.
3. No free path: mark `unusable`, evidence "paid only: <price as shown>".

`allowPaid` true:

1. Fill the form, go to the checkout page, stop. Never type card details,
   never click Pay.
2. Tell the user the price and what it buys, and hand the tab over.
3. After the user pays and you see the confirmation, mark `submitted`.

## personal-contact

1. If every required personal field is already in the profile or `extra` and
   none is in `neverShare`, fill and continue as open-form.
2. If a required field is in `neverShare`: mark `unusable`, evidence
   "requires <field>, which the owner does not share".
3. Otherwise ask the user once (batch the questions), store the answers in
   `extra`, then continue. If they decline, mark `unusable` as above.

## unknown

1. Contact form only, or "email us your tool": mark `unusable`, evidence
   "no submission form; contact/email only". Do not send emails on the
   user's behalf unless they ask.
2. Broken form, submit button hidden or covered, server error on submit:
   try once more after reload. Still broken: mark `unusable` with what
   happened ("submit returns 500").
3. Site down, parked, redirected to an unrelated or unsafe site: mark
   `unusable` ("site dead: <what you saw>").
4. The site is for a different kind of product (games only, local
   businesses only): mark `unusable` ("off-topic: lists only <kind>").
5. Anything you cannot classify: stop and ask the user.

## Run one gate type at a time

Open-form sites finish without help. Captcha, account and paid sites need the
user present. When the user is not around, run open-form and email-verify
sites first, and queue the rest for a session when the user can help.
`next_targets` accepts a `gate` filter for this.
