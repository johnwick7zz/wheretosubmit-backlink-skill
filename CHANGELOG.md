# Changelog

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
