# Evidence

`mark_status` keeps what you write in `evidence` (500 characters max). The
next run, and the user, rely on it. Write what you saw, not what you expect.

## Where to check it

Every `submitted` or `approved` evidence starts with `Check: <url>`, the one
page where the result can be checked later. The next run opens it before
doing anything else, so pick the most direct one you have:

1. the listing itself, when it is live or has a pending URL already;
2. a "my submissions", "dashboard" or "status" page on the site that shows
   this entry;
3. the page you landed on after submit, if it is a stable URL (not a
   one-time `?token=` page);
4. otherwise the site's search page for the product name, or the newest
   listings page, so the checker knows where to look.

The URL lives only as long as the mark does: when a follow-up run marks the
site `approved`, `rejected` or `unusable`, the new evidence replaces it. There
is nothing to clean up.

Never use a verification link, magic link, session URL or anything with a
code in it as the check URL. If the only URL you have is one of those, use
option 4 and say so.

## What counts as a confirmation

Counts:

- A success message on the page after submit: "Thanks, your tool was
  submitted", "Pending review", "We received your submission".
- A redirect to a success URL that shows such a message (`/submitted`,
  `?success=1` together with the message).
- A confirmation email from the site's domain that names the product.
- The listing itself, live on the site (this is `approved`, not `submitted`).
  Note the link while you are there: `link: dofollow` when the anchor to the
  product has no `rel` or only `noopener`; `link: nofollow <rel>` otherwise
  (`nofollow`, `ugc`, `sponsored`). Read the DOM or page source, not the
  record.
- The user telling you they finished the step themselves (captcha, payment)
  and you then seeing one of the above. If you only have their word, say so in
  the evidence: "user reports they submitted; no confirmation seen by agent".

Does not count:

- You clicked submit and nothing visible happened.
- The form cleared itself or the button greyed out.
- A generic thank-you URL with no message.
- An account was created, or a draft was saved.
- A toast that vanished before you could read it. Look for another sign
  (email, dashboard entry) before marking.

When the result is unclear, do not submit again. See "Outcome unknown" in
SKILL.md.

## How to write it

One or two plain sentences, quoting the site where you can:

```
Check: https://example.com/submissions/18342. Page after submit: "Thanks! Your tool is in the review queue (2-3 days)". Screenshot evidence/example.com-20261102.png
```

```
Check: https://example.com/search?q=sample+app. Email "Confirm your submission" from noreply@example.com, clicked the link, page said "Submission confirmed".
```

```
Check: https://example.com/tools/sample-app. Already listed (found via site search).
```

```
Unusable: free plan removed, submit page now only offers a $49 listing.
```

```
Check: https://example.com/pending/sample-app. Badge required before review. Snippet: <a href="https://example.com"><img src="https://example.com/badge.svg" alt="Featured on Example"></a>. Must be on the homepage footer.
```

Rules:

- `submitted` and `approved` start with `Check: <url>` followed by a period.
  `rejected` and `unusable` do not need one.
- Quote the site's own words in double quotes.
- Never include passwords, verification codes, magic links, session URLs or
  other secrets. Write "clicked the verification link", not the link.
- Keep it under 500 characters. Shorten the quote before dropping the facts.
- A new mark replaces the old one, including evidence and followup. When you
  update a site, write the full evidence again, carrying over what still matters.

## Screenshots

1. After a confirmation, take a screenshot of the page that shows it. For
   email confirmations, the page you land on after clicking is enough.
2. Save it to `<workspace>/evidence/<site-domain>-<yyyymmdd>.png`, for example
   `evidence/betalist.com-20261102.png`. Use the site's bare domain (no
   `www.`) and the local date. If the file exists, add `-2`, `-3`.
3. For a badge snippet longer than about 300 characters, also save it to
   `evidence/<site-domain>-badge.html` and point to it in the evidence text.
4. If your browser tool cannot save files, say so in the run report and keep
   the text evidence; do not skip the mark.
5. Evidence screenshots may show the user's email. Suggest adding the
   workspace `evidence/` folder to `.gitignore`.
