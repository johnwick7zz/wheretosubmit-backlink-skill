# Where To Submit MCP server

Let your local AI agent (Claude Code, Cursor, and other MCP clients) read your
submission targets and update your progress on wheretosubmit.org.

- Endpoint: `https://wheretosubmit.org/api/mcp`
- Transport: Streamable HTTP, stateless, `POST` only (JSON responses, no SSE, no sessions)
- Auth: `Authorization: Bearer <token>` on every request

## 1. Get a token

1. Sign in and open **Account**.
2. In the **MCP for AI agents** block, give the token a name (for example
   "Claude Code on MacBook") and click **Generate token**.
3. Copy the token right away. It is shown once. We only keep a hash of it.

The token shows up in the device list with an `MCP` badge. Click **Disconnect**
there to revoke it. You can have 5 active tokens in total (extension devices
and MCP tokens together).

MCP tokens only work on `/api/mcp`, and extension tokens only work for the
browser extension. Any plan can create a token. Reading directory sites works
on every plan; `mark_status`, `create_project`, `update_project` and both
blog-comment tools (`next_comment_targets`, `mark_comment`) need Pro.

## 2. Add it to your client

The account page gives you this snippet, filled in:

```json
{
  "mcpServers": {
    "wheretosubmit": {
      "type": "http",
      "url": "https://wheretosubmit.org/api/mcp",
      "headers": { "Authorization": "Bearer wts_..." }
    }
  }
}
```

- **Claude Code**: put it in `.mcp.json` at your project root, or run
  `claude mcp add --transport http wheretosubmit https://wheretosubmit.org/api/mcp --header "Authorization: Bearer wts_..."`.
- **Cursor**: put it in `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project).

Keep the token out of git. Treat it like a password.

## 3. Tools

| Tool | What it does |
| --- | --- |
| `list_projects` | Your active projects (`id`, `name`, `productUrl`, `domain`) plus `plan` and `isPro`. `domain` is the bare host of `productUrl` (lowercase, no `www.`), or `null`. Call it first. |
| `project_status` | Sites already marked for a project, newest first. Filter by `status` and/or `followup`; page with `limit` (max 100) and `cursor`. Each item has `source` (`manual` or `mcp`), `evidence` and `followup` (or `null`). |
| `next_targets` | Published sites this project has no mark on yet: sites with a known submit page first, then sites with only a homepage (`submitUrl` null, `gated` false; find the submit page from `homepageUrl`), highest DR first within each. `requireSubmitUrl: true` returns only the first group. `limit` (default 10, max 50), filters: `pricing` (`free`, `unknown`, `paid`, or `not_paid` for free plus unknown), `minDr`, `category`, `gate`, `linkType` (`dofollow`/`nofollow`, checked sites only), `search`, `excludeDomains` (up to 50 domains to leave out, e.g. sites opened this run but not marked yet). Pages with `cursor` / `nextCursor` like `project_status`. `brief: true` returns only `siteId`, `name`, `domain`, `homepageUrl`, `submitUrl`, `dr`, `pricing`, `priceText`, `linkType`, `tier`, `gate`, `verdictEn`, `gated`; the default also carries `summaryEn`, `submissionMethodEn`, `tipsEn`, `categories`, `monthlyVisits`. `verdictEn` is a one-sentence call; a verdict starting with "Skip" means don't bother. |
| `get_site` | Full detail for one site by `siteId` or `domain` (a URL works too), English and Chinese text, plus the public `summary` and `verdict` (`{ en, zh }`). Pass `projectId` to also get that project's mark (`status`, `source`, `evidence`, `followup`, `updatedAt`). |
| `mark_status` | Pro only. Record up to 25 marks at once: `{ siteId, status, evidence?, followup? }`. Each mark replaces the old one, so leaving out `evidence` or `followup` clears it. |
| `create_project` | Pro only. `{ name, productUrl?, confirm? }`. Creates a project and returns `{ project, created: true }`. Checks for duplicates first, see below. |
| `update_project` | Pro only. `{ projectId, name?, productUrl? }`. Renames a project or sets/replaces its `productUrl` (it can't be cleared). Returns `{ project }`. |
| `next_comment_targets` | Pro only. Blog pages with an open comment box that this project has not commented on, highest authority score first (ties by `commentLinkId`). `limit` (default 10, max 25), filters: `category`, `minAs`, `search` (domain). `onePerDomain` (default `true`) returns one page per domain, the highest-scoring one, and skips domains that already have any mark for this project. Each item: `commentLinkId`, `domain`, `url`, `authorityScore`, `category`. |
| `mark_comment` | Pro only. Record up to 25 comment results: `{ commentLinkId, status }`. Status only; the comment's URL and text stay in the agent's local report. Upsert, so re-sending is safe. |

Statuses: `submitted`, `approved`, `rejected`, `unusable`. For blog comments
they mean: `approved` the comment is visible on the page right away,
`submitted` the page says it awaits moderation, `unusable` no comment form,
comments closed, email verification or CAPTCHA in the way, or a dead page,
`rejected` the site refused it.

Comment categories: `education`, `tech`, `business`, `media`, `government`,
`nonprofit`, `health`, `lifestyle`, `other`.

Follow-ups (what still has to happen after a mark):

- `badge`: the site wants its badge or a backlink on your product site before
  it approves you. The badge HTML or the exact requirement goes in `evidence`.
- `verify_email`: there's an email verification the agent couldn't finish.
- `awaiting_review`: it's submitted and the site reviews it by hand.

To see your open work for a project, call `project_status` with `followup`
(for example `{ "projectId": "...", "followup": "badge" }`). When you change a
mark yourself on the website, its `evidence` and `followup` are cleared and
`source` goes back to `manual`.

Project names keep the first 80 characters. `productUrl` must start with
`http://` or `https://`, be at most 500 characters and have a real host name,
otherwise you get `invalid_url`. Monthly plans have 9 active projects, lifetime 99; archived ones
don't count.

### Picking the project

The agent should call `list_projects` first and match your product to an
existing project by `domain` or name. If one looks right, it should ask you
whether to reuse it (and use `update_project` to fill in a missing
`productUrl`) instead of creating a new one.

`create_project` also checks on the server. It looks at your active projects
and flags a project when its domain is the same as the new `productUrl`, or
when the names match after cleanup (case, spaces and a trailing `.com`/`.io`/
`.ai` and so on are ignored). A name also matches when one is the start of the
other, when it equals the other project's domain without the TLD
(`myapp` vs `myapp.com`), or when the two names are at
most 2 edits apart (both at least 5 characters). If anything is flagged and
`confirm` isn't `true`, nothing is created. You get `possible_duplicate` with
`candidates: [{ id, name, productUrl, domain, reason }]`. The agent should only
call again with `confirm: true` after you said you want a new project.

Pro-tier sites: on a free plan, `submitUrl`, submission method and tips come
back as `null` with `gated: true`, same as on the website.

Errors come back as a tool error with a JSON body such as
`{"error":"project_not_found"}`. Codes: `project_not_found`, `site_not_found`,
`site_or_domain_required`, `invalid_cursor`, `pro_required`, `duplicate_site`,
`comment_link_not_found`, `duplicate_comment_link`, `invalid_name`,
`invalid_url`, `project_quota_exceeded`, `possible_duplicate`,
`nothing_to_update`, `internal_error`. A projectId that isn't yours is always `project_not_found`.

## 4. Rules for the agent

These are in the tool descriptions too:

- Match the product to an existing project before creating one. Only create a
  new project when there's no match, or when you said you want a new one.
- Before submitting, check the target site for an existing listing of your product.
- Never pay, register accounts, or solve CAPTCHAs unless the user says so.
- Only mark `submitted` after you actually saw a confirmation. Put what you saw
  (confirmation text, email subject) in `evidence`, max 500 characters.
- Use `unusable` for dead sites or sites you can't submit to.
- If a site needs its badge or a backlink on the product site before approval,
  mark it with `followup: "badge"` and put the badge snippet (or the exact
  requirement) in `evidence`, so you can add it to the product site later.
- Use `followup: "verify_email"` when a verification email is waiting that you
  couldn't handle, and `followup: "awaiting_review"` when the site reviews by hand.
- Each mark replaces the previous one. When you update a mark, send the
  `followup` again if it still applies, or leave it out once it's done.
- `mark_status` rejects the whole batch if any `siteId` is unknown or repeated,
  so nothing is half-written. `mark_comment` does the same for `commentLinkId`.
- Blog comments: one comment per domain. Read the post first; the comment has
  to respond to it, in the post's language, with at most one link. Mark
  `approved` only when you can see the comment on the page, `submitted` when
  the page says it is awaiting moderation.

## 5. Submission skill

The procedure an agent should follow when it actually submits (profile layout,
preflight, per-site loop, follow-ups) lives in
[`skills/wheretosubmit-submit/`](../skills/wheretosubmit-submit/) in this
repository (<https://github.com/johnwick7zz/wheretosubmit-backlink-skill>).

In Claude Code, the `wheretosubmit` plugin from this repository installs the
skill and this MCP server together; see the [README](../README.md). In other
agents, copy that folder to wherever the agent loads skills from and connect
the MCP as above.
