# Changelog

## 0.4.0 (2026-11-05)

Faster runs, and the agent handles accounts and mail itself.

- `wheretosubmit-submit`: new `accounts` section in `profile.json`. With
  `permissions.allowRegistration` on, the agent registers or signs in with
  the user's own credentials, logs into the webmail (163, 126, QQ, Gmail,
  Outlook) in a browser tab to read verification codes and links, and never
  invents a password. Email-verify sites are submitted in a batch and the
  mailbox is checked once for all of them. Duplicate check is one site
  search instead of three lookups. Fewer stops: missing facts and odd terms
  become end-of-run questions or `unusable` marks instead of halting the run.
- `wheretosubmit-submit`: target selection uses the new `summaryEn` /
  `verdictEn` from `next_targets` (drops "Skip" verdicts, dead and
  non-directory sites) and the `linkType` filter; orders by `gate`.
- `wheretosubmit-comment`: `next_comment_targets` now returns highest
  authority score first. Off-topic pages are marked `unusable` instead of
  coming back every run. Each run first revisits last run's `submitted`
  comments to record whether they went live and their `rel`.
- `wheretosubmit-submit`: a mandatory readiness checklist before any target
  is chosen (step 7, `references/checklist.md`): connection, product
  profile, accounts and mail, scope, follow-ups, one mark per row, then a
  numbered "Needs you" list. `preflight.mjs --json` gains `facts` for it and
  `report.html` shows the checklist the run started from.
- Preflight checks the `accounts` section and warns when a password is
  stored without `.wheretosubmit/` being git-ignored.

## 0.3.0 (2026-11-03)

Blog comments.

- New skill `wheretosubmit-comment`: picks blog pages through the new MCP
  tools `next_comment_targets` and `mark_comment` (one page per domain),
  reads each post, writes a 250 to 400 character comment that responds to
  it with exactly one body link under descriptive anchor text, fills name,
  email and website from a local `comment.json`, hands CAPTCHAs to the user,
  and records one status per page. Comment URLs, anchor text and the rendered
  `rel` go into the shared `report.html`, never to the server.
- Dofollow mode: asking for dofollow comments (or `hrefBreak: true`) writes
  the body link with a line break before the closing quote of the href, the
  same trick as the browser extension, and records whether the site kept the
  link dofollow.
- `wheretosubmit-submit`: `report.html` gains a Blog comments section and
  keeps the `comments` key written by the new skill.
- `docs/mcp.md`: the two comment tools, their statuses and error codes.

## 0.2.1 (2026-11-03)

- The per-run markdown files under `reports/` are gone. Instead the agent
  rebuilds a single `.wheretosubmit/report.html` at the end of each run from
  `project_status`: every site, status, follow-up, check URL, evidence and
  screenshot, with status and follow-up filters and a "Needs you" list.
  Template: `templates/report.html`, the agent only fills the JSON block.
- `scripts/preflight.mjs` no longer expects a `reports/` folder.

## 0.2.0 (2026-11-03)

Verification and reporting.

- Every `submitted` or `approved` mark now starts its evidence with
  `Check: <url>`, the page where the result can be checked later (listing,
  status page, post-submit page, or the site's search as a last resort).
  Follow-up runs open that URL first instead of searching the site again.
  The URL is replaced together with the mark, so nothing accumulates.
- Each run writes `.wheretosubmit/reports/<yyyymmdd-hhmm>.md`, one row per
  site appended right after its mark (site, status, check URL, evidence,
  follow-up, screenshot). Unmarked sites get a row too, with the reason.
- The final report is built from `project_status` (marks updated during the
  run) rather than from the agent's memory, and gains a Check column plus
  the report file path.
- `scripts/preflight.mjs` also checks for the `reports/` folder.

## 0.1.0 (2026-11-02)

First public release.

- `wheretosubmit-submit` skill: picks targets through the Where To Submit MCP,
  fills each site's form in a real browser from a local product profile,
  checks for existing listings first, hands CAPTCHAs to the user, confirms by
  page or email, and records progress and follow-ups (badge, email
  verification, awaiting review).
- `scripts/preflight.mjs`: checks the product profile before a run. Node 20+,
  no dependencies.
- Claude Code plugin `wheretosubmit` and marketplace `wheretosubmit`, bundling
  the skill and the hosted MCP server (`https://wheretosubmit.org/api/mcp`).
  The MCP token is read from the `WHERETOSUBMIT_TOKEN` environment variable.
- `docs/mcp.md`: MCP setup, tool list, statuses, follow-ups and error codes.
