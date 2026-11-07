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
- A way to read the `contact.email` mailbox for codes and links. The default
  is webmail in the same browser: with `accounts` filled in, the agent logs
  into mail.163.com / mail.qq.com / Gmail / Outlook itself and reads the
  verification messages there. A mail MCP or IMAP script works too. With
  neither, email-verify and account sites are skipped.
- Node 20+ to run `scripts/preflight.mjs` and `scripts/probe.mjs` (optional
  but recommended).

Paths in this file are relative to this SKILL.md.

## Hard rules

1. Never pay. With `permissions.allowPaid` true, go as far as the checkout
   page and hand it to the user; never type payment details.
2. Register or sign in only when `permissions.allowRegistration` is true (or
   the user says so for this run), and only with the credentials in
   `accounts`. Never invent a password, never store one the user did not
   give, never type credentials into a site other than the one they are for.
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
7. If you cannot read the mailbox (webmail login failed and no mail tool), do
   not start email-verify or account sites.
8. Never choose targets before the readiness checklist (step 7) has been
   shown to the user in this run. Any ❌ row means wait for the user.
9. Never edit the user's website (badges, backlinks). List what is needed.
10. When something unexpected happens, stop and tell the user instead of guessing.

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
5. Say how you will read mail: webmail in the browser (default when
   `accounts` has credentials), a mail tool, or none.

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
6. `project_quota_exceeded`: the user hit their active-project limit (9 monthly, 99 lifetime); ask them to
   archive one on the website.

### 3. Set up the workspace and profile

The workspace is `./.wheretosubmit/` in the current project unless the user
names another folder.

```
.wheretosubmit/
  profile.json      product facts, copy, permissions, saved answers
  assets/           logo-512.png, wide logo, og image, screenshots
  evidence/         confirmation screenshots: <site-domain>-<yyyymmdd>.png
  report.html       one page with every site's status, rebuilt after each run
  targets.json      the last next_targets result, input for probe.mjs (overwritten each run)
```

There is no local ledger. Progress lives only in the MCP. `report.html` is a
read-only copy for the user, generated from `project_status` at the end of
each run (step 10).

If `profile.json` is missing:

1. Create the folder with `assets/` and `evidence/`, and copy
   `templates/profile.json` into it.
2. Draft it from the product itself: homepage, pricing page, about page,
   meta and Open Graph tags, JSON-LD (`SoftwareApplication`, `Organization`,
   `Product`), and the repository README if you are in one. Write the copy
   variants from the product's own wording. Record what you read in `source`.
3. Save the logo and screenshots into `assets/` if your tools can download
   files; otherwise ask the user for them.
4. Leave unknown facts `null`. Do not fill company size, founding year,
   address or similar from guesses.
5. Set `updatedAt`. The user sees and confirms the profile through the
   readiness checklist (step 7); do not ask separately here, unless a core
   fact (name, URL, contact email) could not be found anywhere.
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
[references/email-verification.md](references/email-verification.md): open
the webmail in its own tab, sign in with `accounts.mailbox` (or
`accounts.default`), and leave that tab open for the whole run. Record the
result: mailbox readable or not. Not readable means no email-verify and no
account sites this run.

### 6. Handle follow-ups from earlier runs

Call `project_status` with `followup: "badge"`, then `"verify_email"`, then
`"awaiting_review"` (page with `nextCursor`). If there are many, ask whether
to do them before new submissions.

Each mark's `evidence` starts with `Check: <url>`. Open that URL first; only
search the site when it is missing or dead.

- `badge`: open the page where the badge must be (usually the product
  homepage) and look for the site's badge or link. Then check the listing on
  the site. Listed: mark `approved` with the listing URL. Badge live but not
  listed: do any "I added the badge" step the site has, then mark `submitted`,
  `followup: "awaiting_review"`, evidence "badge live since <date>". Badge not
  live: leave the mark, list it again in the report.
- `verify_email`: see "On a later run" in email-verification.md.
- `awaiting_review` older than 7 days: open the check URL. Listed: mark
  `approved` with `Check: <listing url>`. Not listed: leave it. Never resubmit.

### 7. Readiness checklist

Mandatory, once per run, before any target is chosen. Put together what
steps 1 to 6 found and show it as the checklist in
[references/checklist.md](references/checklist.md): five fixed groups
(connection, product profile, accounts and mail, scope, follow-ups), one
mark per row (✅ verified, ⚠️ default assumed, ❌ blocks sites, ➖ not this
run), then a numbered "Needs you" list with "add" items before "confirm"
items.

Every row is something you actually did this run: the MCP call, the tab you
opened, the webmail you signed into, `preflight.mjs --json` (`facts`,
`errors`, `warnings`), `project_status` for follow-ups. Do not fill a row
from memory of an earlier run.

Any ❌: stop and wait; when the user has supplied what was missing, update
those rows and continue. Only ⚠️ or ✅: continue to step 8 in the same
message; the target plan's go-ahead also covers the confirm items. Keep the
rows: step 10 writes them into the report.

### 8. Choose targets

1. Ask how many sites (default 10). Do not ask about categories and do not
   pass `category`: the goal is every site that costs nothing, whatever its
   niche. Use `category` only when the user asks for one.
2. Call `next_targets` with the project id, `brief: true`, and a `limit`
   about twice the number you need, so there is room to drop sites. Add
   `pricing: "not_paid"` (free plus not-yet-checked) unless `allowPaid` is
   true; do not narrow it to `"free"`, most free sites are still marked
   `unknown`. Add `linkType: "dofollow"` only when the user asks for links
   that count (unchecked sites are then left out). The list comes in two
   groups: sites with a known `submitUrl` first, then sites with only a
   `homepageUrl` (`submitUrl` null, `gated` false). Both are targets: for
   the second group you find the submit page yourself (step 9). Put every
   domain you opened earlier this run but left unmarked (captcha waiting,
   outcome unknown, over budget) in `excludeDomains`, so they do not come
   back. Need more: call again with
   the returned `nextCursor` instead of changing filters. The brief list has
   no tips or method; `get_site` in step 9 brings those for the sites you
   keep.
3. Drop from the result every site whose `verdictEn` starts with "Skip",
   says the site is down, or says it is not a submission site. Read the
   other verdicts: they tell you what the free tier gets, whether a badge is
   expected, and how long the queue is. Keep that in mind, but the page you
   open is the truth.
3b. Probe the rest before opening any of them. Save the targets to
   `<workspace>/targets.json` and run

   ```
   node <skill-folder>/scripts/probe.mjs --input <workspace>/targets.json
   ```

   It fetches every submit page at once (plain HTTP, a few seconds); for a
   homepage-only site it fetches the homepage and lists same-site links that
   look like a submit page (`homepage only; submit link: ...`). It sorts
   them: `form` (a form with a URL field; open these first), `unknown`
   (JS-rendered, open and see), `captcha`, `login` (account gate), `paid`
   (prices and no free wording; handle per gates.md or skip), `no-form`,
   `blocked` (bot wall; a real browser may pass), `dead` (connection error,
   404, parked). Use it to order and to drop: open a `dead` site once in the
   browser to confirm, then mark `unusable`; put `paid` ones last. For a
   homepage-only row the class describes the homepage: `dead` still means
   dead, but `paid` or `no-form` there says nothing about the submit page,
   so do not drop it for that. The probe reads static HTML only, so it is a
   hint; the page you open decides.
4. Keep sites with a known `submitUrl` ahead of homepage-only ones, then
   order by `gate`: `open-form` first, then `email-verify` and
   `account` (both work on their own once the mailbox is open), then
   `reciprocal`, and `captcha` last, grouped together so the user can solve
   them in one sitting. Within a gate, put sites whose verdict names a free
   path before sites with `pricing: "unknown"`, so the uncertain ones do not
   eat the start of the run. `gate` is a hint from an earlier check, not a
   rule: classify the page you see.
5. Set aside complex sites (Product Hunt, G2, Capterra-type marketplaces)
   unless the user asked for them; they follow
   [references/complex-sites.md](references/complex-sites.md).
6. Show the plan (name, domain, DR, gate, pricing, one line of verdict)
   under the checklist and get one go-ahead; that reply also settles the
   checklist's confirm items. After that, work through the list without
   asking per site, except where a rule says ask.

### 9. Submit, one site at a time

For each site:

1. **Read the record.** Call `get_site` with `siteId` and `projectId`. If
   `mark` is not null, someone already marked it: skip. Read `gate`,
   `submitUrl`, `submissionMethod`, `tips`, `pricing` and `priceText`. If
   `submitUrl` is null (`gated` true, or no submit page on file), find the
   submit page from `homepageUrl` yourself: start with the probe's submit
   link, else the header, footer and menu ("Submit", "Add tool", "List your
   product", "Get listed"), else one try of `/submit`. Count this against
   the per-site budget. No way to submit found: mark `unusable` with
   "no submit page found on <homepage>". A homepage that turns out to be a
   blog, a social network or a bookmark site with no listing to submit to is
   `unusable` too ("not a submission site").
2. **Open the site** in the browser, in a new tab.
3. **Look for an existing listing.** One check, not three: use the site's
   own search for the product name (and the domain if the first search is
   empty). Only when the site has no search box, try one likely listing URL
   such as `/tools/<slug>` or `/<slug>`. Skip the web search; most
   directories' pages are not indexed by name anyway, and a duplicate
   submission is caught by the site. A hit means a result whose link points
   at the product's domain (open it and check the address bar or the outbound
   link); a result that merely contains the product's words is not a hit.
   Found: mark `approved`, evidence = listing URL, and move on.
4. **Classify the page** you see (paid wall, account, captcha, badge,
   personal fields) and compare with `permissions`. Follow
   [references/gates.md](references/gates.md) for that gate.
5. **Fill the form** following
   [references/field-mapping.md](references/field-mapping.md). Read the whole
   form, including its last step, before typing. A field that will not take
   input, a dropdown that will not open, a button off screen or a rich-text
   box: use the matching move in
   [references/form-tricks.md](references/form-tricks.md) once, then count
   further retries against the per-site budget.
6. **Submit** with the real submit control, then wait and read the result.
7. **Read the whole confirmation page, then the site's next email.** Both
   often carry a further step (a badge, a verification, a community task from
   gates.md). A sentence like "to move up the queue, do X" is a task, not
   background text: do it now or list it under "Needs you". On the next
   mailbox round, open every message from the site with a subject such as
   "next step" or "action required"; do not judge them from the inbox list.
8. **Confirmation seen:** note the check URL (the listing, a status page, or
   the page you are on; evidence.md says how to pick), save a screenshot to
   `evidence/` and call `mark_status` right away with evidence that starts
   with `Check: <url>`, as described in
   [references/evidence.md](references/evidence.md). Whenever the listing
   itself is live (an `approved` mark, now or on a follow-up), read the
   `rel` attribute of its link to the product and add `link: dofollow` or
   `link: nofollow <rel value>` to the evidence; the record's `linkType` is
   often wrong and this is the only reliable check.
9. **No clear result:** follow "Outcome unknown" below.
10. **Keep a note** of the site, outcome, check URL and screenshot path; the
   unmarked ones (captcha, account, unknown) only exist in your notes and
   are needed for the report.
11. **Learned something?** Save new length variants to `copy` and new answers
    to `extra` in the profile.

#### Which mark to write

| Situation | status | followup |
| --- | --- | --- |
| Already listed | `approved` | none |
| Submitted, listing visible right away | `approved` | none |
| Confirmation seen, site reviews by hand | `submitted` | `awaiting_review` |
| Confirmation seen, badge or backlink required | `submitted` | `badge` |
| Confirmation seen, community task done | `submitted` | `awaiting_review` |
| Confirmation seen, community task not done | `submitted` | `awaiting_review`, and list it under "Needs you" |
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

### Keep moving; collect questions

The run should not stall on one site. Stop the run only for:

- a page asking for payment details, or a price on the only path when
  `allowPaid` is true (hand over the tab);
- the browser showing a download, a permission prompt, or a page that looks
  unsafe;
- an MCP call failing with anything other than the expected errors in
  `docs/mcp.md`;
- three sites in a row failing the same way (likely a browser or session
  problem);
- an action that would change the user's own website or settings.

Everything else is a note, not a stop:

- a site that eats the budget: about 8 browser actions (or 6 minutes) on one
  site without visible progress, such as a field that will not take input, a
  button that will not react, an upload that keeps failing. Leave it unmarked,
  write one line of note (what you tried, where it stuck) and the submit URL
  for the report, and move on. Come back only if time is left at the end.
  The user can finish it by hand faster than you can keep retrying;
- a required fact missing from the profile and `extra`: leave the site
  unmarked, put the question in the "Needs you" list, and continue; ask all
  collected questions together at the end (or at a natural break), save the
  answers to `extra`, and come back to those sites in the same run if time
  allows;
- unusual terms (fees, renewals, exclusive rights, an unexpected backlink):
  do not submit; mark `unusable` with the term quoted, unless it is a badge
  requirement, which is the `reciprocal` gate;
- a price where none was expected and `allowPaid` is false: look for a free
  path; none means `unusable` ("paid only: <price>"); never stop to ask;
- a page you cannot classify: leave it unmarked with a one-line note and move
  on.

### 10. Report

Two outputs: the summary in chat, and `<workspace>/report.html`.

#### Report file

1. Call `project_status` for the project and page through all of it
   (`nextCursor`). Every mark becomes one row. The MCP is the truth; do not
   add marks from memory.
2. Add one row per site you touched this run but left unmarked (captcha,
   account, no mailbox, outcome unknown), with `status: "unmarked"` and the
   reason in `note`.
3. Copy `templates/report.html` from this skill to `<workspace>/report.html`
   (overwrite the old one) and replace the JSON inside
   `<script id="data" type="application/json">` with the block below. If the
   old file had a `comments` array (written by the `wheretosubmit-comment`
   skill), carry it over unchanged; this skill owns `sites` only.

```json
{
  "project": { "name": "<project name>", "productUrl": "<url>" },
  "generatedAt": "<yyyy-mm-dd hh:mm local>",
  "readiness": { "checkedAt": "<yyyy-mm-dd hh:mm local>", "rows": [ { "group": "Connection", "item": "MCP", "mark": "pass", "result": "..." } ] },
  "sites": [
    {
      "name": "Example", "domain": "example.com",
      "status": "submitted",
      "check": "https://example.com/submissions/18342",
      "evidence": "\"Thanks! Your tool is in the review queue\"",
      "followup": "awaiting_review",
      "screenshot": "evidence/example.com-20261103.png",
      "updatedAt": "2026-11-03T07:30:00Z",
      "note": ""
    }
  ],
  "comments": []
}
```

- `readiness.rows` are the checklist rows from step 7 (`mark`: `pass`,
  `confirm`, `missing`, `na`), in the order shown, no secrets in `result`.
- `status` is `approved`, `submitted`, `rejected`, `unusable` or `unmarked`.
- `check` is the URL from the `Check:` prefix of the evidence; for an
  unmarked site, the submit page so the user can finish it. `evidence` is the
  rest of the evidence text, no secrets. `followup`, `screenshot`, `note` may
  be empty strings. `screenshot` is relative to the workspace.
- Valid JSON only: escape quotes, no trailing commas. The page renders an
  empty table if the JSON is broken, so open it once and check.
- Change nothing else in the file. If your tools cannot write files, say so
  and give the table in chat only.

#### Chat summary

End every run with this, in the user's language, then the path of the
report file:

```
Run summary: <n> sites tried, <a> approved, <s> submitted, <u> unusable, <r> rejected, <k> left unmarked.

| Site | Status | Check | Evidence | Followup |
| --- | --- | --- | --- | --- |
| example.com | submitted | https://example.com/submissions/18342 | "Thanks, your tool is in review" | awaiting_review |

Report: .wheretosubmit/report.html

Needs you:
- [ ] Captcha tabs to finish: <site, tab>
- [ ] Badges to embed: <site>: <snippet or evidence file>, place: <where>
- [ ] Emails to verify: <site>
- [ ] Community tasks not done: <site>: <what the site asks for>
- [ ] Sites that need your account: <site, sign-up URL>
- [ ] Outcome unknown: <site, time submitted>
- [ ] Questions: <what you need answered>
```

Keep evidence in the table short (a few words of the quote). The `Check`
column is a plain URL the user can click to see the listing or its status.
Leave out empty checklist lines.

## References

- [references/profile-schema.md](references/profile-schema.md): every profile field, tiers, limits
- [references/checklist.md](references/checklist.md): readiness checklist rows, marks, example
- [references/field-mapping.md](references/field-mapping.md): filling forms by meaning, length rules
- [references/gates.md](references/gates.md): playbook per gate
- [references/email-verification.md](references/email-verification.md): mailbox check, codes, magic links
- [references/evidence.md](references/evidence.md): what counts as confirmation, wording, screenshots
- [references/complex-sites.md](references/complex-sites.md): Product Hunt, G2, Capterra-type outlines
- [references/form-tricks.md](references/form-tricks.md): React inputs, custom dropdowns, off-screen buttons, rich text
- `templates/profile.json`: profile template
- `templates/report.html`: report page, fill the JSON block
- `scripts/preflight.mjs`: profile check (`--dir`, `--json`)
- `scripts/probe.mjs`: batch HTTP probe of submit pages (`--input`, `--json`, `--concurrency`, `--timeout`)
