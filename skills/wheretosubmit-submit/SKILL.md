---
name: wheretosubmit-submit
description: Submit the user's product to the directories and launch sites tracked on wheretosubmit.org, one site at a time in a real browser, as carefully as a human would. Picks targets and records progress through the Where To Submit MCP (list_projects, next_targets, get_site, mark_status, project_status), fills each form from a local product profile, checks for existing listings first, hands CAPTCHAs to the user, confirms by page or email, and follows up on badges and email verification. Use when the user asks to submit their product to directories, run directory submissions or backlink submissions, continue a submission batch, launch on Product Hunt or G2, or check pending badge and verification follow-ups. Also triggers on 提交目录, 外链提交, 提交网站到目录站, 批量提交产品, 去目录站提交.
---

# Where To Submit: directory submissions

This skill submits one product to directories and launch sites. The
Where To Submit MCP supplies the targets and stores progress. Product facts
live in a local profile that never leaves the user's machine. A browser tool
does the submitting.

What you need:

- The `wheretosubmit` MCP server. Reading works on every plan; recording
  progress (`mark_status`, `create_project`, `update_project`) needs Pro.
- A browser tool. Use whichever is available in this environment. ego-browser
  is the one this skill is tested with (the user shares the window and can
  take over a CAPTCHA); Claude in Chrome, the desktop built-in browser and
  Playwright MCP also work.
- A mail tool for sites that verify by email. Use whichever is available
  (Gmail MCP, an IMAP script, ...). Without one, those sites are skipped.
- Node 20+ to run `scripts/preflight.mjs` (optional but recommended).

Paths in this file are relative to this SKILL.md.

## Hard rules

1. Never pay. With `permissions.allowPaid` true, go as far as the checkout
   page and hand it to the user; never type payment details.
2. Never register accounts unless `permissions.allowRegistration` is true or
   the user says so for this run. Never create or store passwords.
3. Never solve, click through or bypass a visible CAPTCHA. With
   `allowCaptchaHandoff` true (default), fill the form and hand the CAPTCHA to
   the user.
4. Never invent facts. Use only the profile, `extra`, and answers the user
   gave. You may shorten or rephrase profile text, nothing more.
5. One listing per site. Check for an existing listing before submitting.
   Never submit twice, even when the first result was unclear.
6. Mark `submitted` only after you saw a confirmation page or email, and
   start its evidence with `Check: <url>`, the page where the result can be
   checked later (see evidence.md). Mark `rejected` only when the site said
   no. Use `unusable` with a reason for dead, paid-only (when paying is not
   allowed), off-topic or blocked sites.
7. If you cannot read the mailbox, do not start email-verify or account sites.
8. Never edit the user's website (badges, backlinks). List what is needed.
9. When something unexpected happens, stop and tell the user instead of guessing.

## Workflow

1. Check tools
2. Pick the project
3. Set up the workspace and profile
4. Run preflight
5. Check the mailbox
6. Handle follow-ups from earlier runs
7. Choose targets
8. Submit, one site at a time
9. Report

### 1. Check tools

1. Call `list_projects`. Note `plan` and `isPro`.
2. If the tool is missing or returns an auth error, stop. Tell the user to
   create a token on wheretosubmit.org (Account, "MCP for AI agents") and
   connect it, for Claude Code:
   `claude mcp add --transport http wheretosubmit https://wheretosubmit.org/api/mcp --header "Authorization: Bearer wts_..."`.
   Full setup is in this skill's README.md and in `docs/mcp.md` of the
   Where To Submit repository.
3. Not Pro: `mark_status` will fail with `pro_required`, and Pro-tier sites
   come back with `gated: true` (no `submitUrl`, method or tips). Tell the
   user and ask whether to continue with results kept only in the final report.
4. Name the browser tool you will use. No browser tool: stop.
5. Name the mail tool you will use, or say there is none.

### 2. Pick the project

1. Find the product URL: ask the user, or read it from the current repository
   (package.json `homepage`, README, deploy config) and confirm.
2. Match it against `list_projects` by `domain` (bare host, no `www.`), then
   by name.
3. One match: ask the user to confirm reuse. If its `productUrl` is empty,
   call `update_project` with the URL after they confirm.
4. No match: call `create_project` with `name` and `productUrl`.
5. `possible_duplicate`: show the candidates and ask. Call again with
   `confirm: true` only if the user wants a new project.
6. `project_quota_exceeded`: the user has 10 active projects; ask them to
   archive one on the website.

### 3. Set up the workspace and profile

The workspace is `./.wheretosubmit/` in the current project unless the user
names another folder.

```
.wheretosubmit/
  profile.json      product facts, copy, permissions, saved answers
  assets/           logo-512.png, wide logo, og image, screenshots
  evidence/         confirmation screenshots: <site-domain>-<yyyymmdd>.png
  reports/          one markdown table per run: <yyyymmdd-hhmm>.md
```

There is no local ledger. Progress lives only in the MCP. The run report is
a copy for the user, written row by row during the run (see "Run report"
under step 8); it can always be rebuilt from `project_status`.

If `profile.json` is missing:

1. Create the folder with `assets/`, `evidence/` and `reports/`, and copy
   `templates/profile.json` into it.
2. Draft it from the product itself: homepage, pricing page, about page,
   meta and Open Graph tags, JSON-LD (`SoftwareApplication`, `Organization`,
   `Product`), and the repository README if you are in one. Write the copy
   variants from the product's own wording. Record what you read in `source`.
3. Save the logo and screenshots into `assets/` if your tools can download
   files; otherwise ask the user for them.
4. Leave unknown facts `null`. Do not fill company size, founding year,
   address or similar from guesses.
5. Show the user a short summary (name, URL, tagline, pricing model,
   categories, contact email, permissions) plus the list of nulls, and ask
   them to confirm or correct. Then set `updatedAt`.
6. Suggest adding `.wheretosubmit/evidence/` to `.gitignore`.

If it exists, read it and keep it; only add to it (new length variants,
answers in `extra`). Schema: [references/profile-schema.md](references/profile-schema.md).

### 4. Run preflight

```
node <skill-folder>/scripts/preflight.mjs --dir <workspace>
```

Exit 0 means ready; warnings only reduce how many forms can be filled
completely. Exit 1 lists blocking problems: fix them with the user and run
again. Without Node, check the core fields by hand against profile-schema.md.

### 5. Check the mailbox

Follow "Before the batch" in
[references/email-verification.md](references/email-verification.md).
Record the result: mailbox readable or not. Not readable means no
email-verify and no account sites this run.

### 6. Handle follow-ups from earlier runs

Call `project_status` with `followup: "badge"`, then `"verify_email"`, then
`"awaiting_review"` (page with `nextCursor`). If there are many, ask whether
to do them before new submissions.

Each mark's `evidence` starts with `Check: <url>`. Open that URL first; only
search the site when it is missing or dead. Every follow-up you touch gets a
row in the run report too, with the new status.

- `badge`: open the page where the badge must be (usually the product
  homepage) and look for the site's badge or link. Then check the listing on
  the site. Listed: mark `approved` with the listing URL. Badge live but not
  listed: do any "I added the badge" step the site has, then mark `submitted`,
  `followup: "awaiting_review"`, evidence "badge live since <date>". Badge not
  live: leave the mark, list it again in the report.
- `verify_email`: see "On a later run" in email-verification.md.
- `awaiting_review` older than 7 days: open the check URL. Listed: mark
  `approved` with `Check: <listing url>`. Not listed: leave it. Never resubmit.

### 7. Choose targets

1. Ask how many sites (default 10) and whether to focus on a category.
2. Call `next_targets` with the project id and `limit`. Add
   `pricing: "free"` unless `allowPaid` is true. Use `gate` to run one kind at
   a time: `open-form` first; `email-verify` only with a readable mailbox;
   `captcha` when the user is around to solve them. `category` narrows to
   relevant directories.
3. Set aside complex sites (Product Hunt, G2, Capterra-type marketplaces)
   unless the user asked for them; they follow
   [references/complex-sites.md](references/complex-sites.md).
4. Show the plan (name, domain, DR, gate, pricing) and get one go-ahead.
   After that, work through the list without asking per site, except where a
   rule says ask.

### 8. Submit, one site at a time

For each site:

1. **Read the record.** Call `get_site` with `siteId` and `projectId`. If
   `mark` is not null, someone already marked it: skip. Read `gate`,
   `submitUrl`, `submissionMethod`, `tips`, `pricing` and `priceText`. If
   `gated` is true, find the submit page from `homepageUrl` yourself.
2. **Open the site** in the browser, in a new tab.
3. **Look for an existing listing**, in this order:
   1. the site's own search, for the product name, alternate names and domain;
   2. a web search for `site:<domain> "<product name>"`;
   3. likely listing URLs such as `/tools/<slug>`, `/product/<slug>`, `/<slug>`.

   Check in the browser, since many directories render search results with
   JavaScript. Found: mark `approved`, evidence = listing URL, and move on.
4. **Classify the page** you see (paid wall, account, captcha, badge,
   personal fields) and compare with `permissions`. Follow
   [references/gates.md](references/gates.md) for that gate.
5. **Fill the form** following
   [references/field-mapping.md](references/field-mapping.md). Read the whole
   form, including its last step, before typing.
6. **Submit** with the real submit control, then wait and read the result.
7. **Confirmation seen:** note the check URL (the listing, a status page, or
   the page you are on; evidence.md says how to pick), save a screenshot to
   `evidence/` and call `mark_status` right away with evidence that starts
   with `Check: <url>`, as described in
   [references/evidence.md](references/evidence.md).
8. **No clear result:** follow "Outcome unknown" below.
9. **Write the report row** for this site (see "Run report"), whatever the
   outcome, including skipped and unknown.
10. **Learned something?** Save new length variants to `copy` and new answers
    to `extra` in the profile.

#### Run report

At the start of the batch create `<workspace>/reports/<yyyymmdd-hhmm>.md`
(local time) with this header, then append one row per site right after its
mark, not at the end, so an interrupted run still leaves a usable table:

```
# Where To Submit run <yyyy-mm-dd hh:mm>

Project: <name> (<productUrl>)

| Site | Status | Check | Evidence | Followup | Screenshot |
| --- | --- | --- | --- | --- | --- |
| example.com | submitted | https://example.com/submissions/18342 | "in the review queue (2-3 days)" | awaiting_review | evidence/example.com-20261103.png |
| other.io | unmarked (captcha) | https://other.io/submit | form filled, captcha handed to user | | |
```

- `Status` is the mark you wrote, or `unmarked (<reason>)` when you wrote
  none: captcha, account, no mailbox, outcome unknown, skipped.
- `Check` is the same URL as the `Check:` prefix in the evidence. For an
  unmarked site put the submit page so the user can finish it.
- `Evidence` is a few words of the quote, no secrets, same rules as the
  MCP evidence. `Screenshot` is the relative path or empty.
- If your tools cannot write files, keep the table in your working notes and
  say so in the final report.

#### Which mark to write

| Situation | status | followup |
| --- | --- | --- |
| Already listed | `approved` | none |
| Submitted, listing visible right away | `approved` | none |
| Confirmation seen, site reviews by hand | `submitted` | `awaiting_review` |
| Confirmation seen, badge or backlink required | `submitted` | `badge` |
| Page asked to confirm by email, not completed | `submitted` | `verify_email` |
| Dead, paid only, no form, off-topic, needs a `neverShare` field | `unusable` | none |
| Site said no (page or email) | `rejected` | none |
| Skipped by permissions (account, captcha off, no mailbox) | leave unmarked | |
| Outcome unknown | leave unmarked | |

About `mark_status`:

- Each mark replaces the previous one for that site, including `evidence`
  and `followup`. Omitting either clears it, so always send full evidence.
- Up to 25 marks per call. The whole call fails if any `siteId` is unknown or
  repeated, so nothing is half-written.
- Mark right after each site, not at the end, so an interrupted run loses
  nothing.

#### Outcome unknown

You pressed submit and saw no confirmation and no error.

1. Do not submit again.
2. Check the mailbox for a message from the site, any "my submissions" page,
   and the site's newest listings.
3. Still nothing: leave the site unmarked and list it under "Outcome unknown"
   with the time you submitted. The user decides.
4. It will show up again in `next_targets` next run. Check for the listing
   first and ask the user before trying again.

### Stop and ask the user

Stop the run and ask when:

- a page asks for payment details, or a price appears where none was expected;
- a required fact is missing from the profile and `extra` (ask once, save it);
- terms ask for something unusual: fees, renewals, exclusive rights, an
  unexpected backlink;
- the browser shows a download, a permission prompt (notifications,
  extensions, location), or a page that looks unsafe;
- you cannot classify a page;
- an MCP call fails with anything other than the expected errors in
  `docs/mcp.md`;
- three sites in a row fail the same way (likely a browser or session problem);
- an action would change the user's own accounts, website or settings.

### 9. Report

Before writing it, call `project_status` for the project and take every mark
whose `updatedAt` is at or after the time this run started. That list is the
truth for the table; your own notes only add the unmarked rows. If a row in
the report file disagrees with the MCP, fix the file. Note the time you
started the run when you begin step 7 so this comparison is possible.

End every run with this, in the user's language, then give the path of the
report file:

```
Run summary: <n> sites tried, <a> approved, <s> submitted, <u> unusable, <r> rejected, <k> left unmarked.

| Site | Status | Check | Evidence | Followup |
| --- | --- | --- | --- | --- |
| example.com | submitted | https://example.com/submissions/18342 | "Thanks, your tool is in review" | awaiting_review |

Report file: .wheretosubmit/reports/20261103-1530.md

Needs you:
- [ ] Captcha tabs to finish: <site, tab>
- [ ] Badges to embed: <site>: <snippet or evidence file>, place: <where>
- [ ] Emails to verify: <site>
- [ ] Sites that need your account: <site, sign-up URL>
- [ ] Outcome unknown: <site, time submitted>
- [ ] Questions: <what you need answered>
```

Keep evidence in the table short (a few words of the quote). The `Check`
column is a plain URL the user can click to see the listing or its status.
Leave out empty checklist lines.

## References

- [references/profile-schema.md](references/profile-schema.md): every profile field, tiers, limits
- [references/field-mapping.md](references/field-mapping.md): filling forms by meaning, length rules
- [references/gates.md](references/gates.md): playbook per gate
- [references/email-verification.md](references/email-verification.md): mailbox check, codes, magic links
- [references/evidence.md](references/evidence.md): what counts as confirmation, wording, screenshots
- [references/complex-sites.md](references/complex-sites.md): Product Hunt, G2, Capterra-type outlines
- `templates/profile.json`: profile template
- `scripts/preflight.mjs`: profile check (`--dir`, `--json`)
