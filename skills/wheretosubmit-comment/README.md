# wheretosubmit-comment

An agent skill that leaves blog comments with a backlink on the pages listed
under Comments on [wheretosubmit.org](https://wheretosubmit.org). The agent
picks pages from your Where To Submit project, reads each post, writes a
short comment that actually responds to it, fills your name, email and
website, and records one status per page back to your account. Comment
URLs and texts stay in a local report on your machine.

One comment per blog, ever, with one link in the text under descriptive
anchor text (and the product URL in the Website field when there is one).
CAPTCHAs are handed to you. No accounts, no third-party comment systems, no
email verification.

It shares the `./.wheretosubmit/` workspace with the `wheretosubmit-submit`
skill. Setup of the MCP server and the browser tool is the same; see that
skill's README. Pro plan required.

## Files

```
SKILL.md                        workflow the agent follows
templates/comment.json          identity, linkable pages, style examples, run settings
scripts/preflight.mjs           checks comment.json, no dependencies
references/comment-writing.md   what a comment must look like, anchor rules, placement, href line break
references/form-rules.md        finding the form, honeypots, CAPTCHA, submit button, pacing
```

## Quick start

1. Copy `templates/comment.json` to `./.wheretosubmit/comment.json` and fill
   in your identity and the product pages you want linked; or let the agent
   draft it and confirm.
2. `node scripts/preflight.mjs --dir ./.wheretosubmit`
3. Ask the agent: "post a batch of blog comments for <product>".
