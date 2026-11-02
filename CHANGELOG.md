# Changelog

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
