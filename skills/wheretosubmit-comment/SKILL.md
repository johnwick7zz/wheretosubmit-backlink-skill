---
name: wheretosubmit-comment
description: Leave a comment with a backlink on the blog pages tracked on wheretosubmit.org, one page at a time in a real browser, as a real reader would. Picks pages through the Where To Submit MCP (next_comment_targets, mark_comment), reads each post, writes a short comment that responds to it with at most one link to a relevant page of the product, fills name, email and website from a local identity file, hands CAPTCHAs to the user, and keeps the comment URLs in a local report. Use when the user asks to post blog comments, build comment backlinks, run a comment batch, continue commenting, or post dofollow blog comments (the dofollow request turns on the href line-break mode). Also triggers on 评论外链, 博客评论, 去博客留言, 评论提交, 跑一批评论, dofollow 评论.
---

# Where To Submit: blog comments

This skill posts one comment per blog, with the product linked once, on pages
that still accept comments. The Where To Submit MCP supplies the pages and
stores one status per page. Everything else (who you are, what to link, what
you wrote, where the comment ended up) stays on the user's machine.

It shares the workspace with the `wheretosubmit-submit` skill: the same
`./.wheretosubmit/` folder, the same `profile.json` for product facts, the
same `report.html`.

What you need:

- The `wheretosubmit` MCP server with a Pro plan. Both comment tools are Pro
  only; without Pro, stop and tell the user.
- A browser tool. ego-browser is the one this skill is tested with (the user
  shares the window and can take over a CAPTCHA); Claude in Chrome, the
  desktop built-in browser and Playwright MCP also work.
- Node 20+ to run `scripts/preflight.mjs` (optional but recommended).

No mail tool is needed. Pages that require email verification before the
first comment are skipped.

Paths in this file are relative to this SKILL.md.

## Hard rules

1. One comment per domain, ever. `next_comment_targets` already hides
   domains with a mark; never go around it.
2. Read the post before writing. The comment must respond to something
   specific in it. No post, no comment.
3. At most one link, and only to a page listed in `comment.json`. Never link
   the product homepage unless it is the only page listed.
4. Every comment carries exactly one link in its body, as an `<a href>`
   with descriptive anchor text, to a page listed in `comment.json`. The
   website field is filled too when the form has one. `linkInBody:
   "when-no-website-field"` is the opt-out for users who want the link on
   their name only.
5. Never fill hidden, zero-size or off-screen inputs. They are honeypots.
6. Never solve, click through or bypass a CAPTCHA. Fill the form and hand it
   to the user when `allowCaptchaHandoff` is true, otherwise skip the page.
7. Never register an account, never log in to a third-party comment system
   (Disqus, Facebook, Giscus). Skip those pages.
8. Never invent facts about the product or the linked page. Use only
   `profile.json`, `comment.json` and the post itself.
9. Mark `approved` only when you can see the comment on the page. Mark
   `submitted` only when the page said it is waiting for moderation.
10. Keep the pace of a person. Follow the delays in
    [references/form-rules.md](references/form-rules.md). Ten pages per run by
    default, never more than 25.
11. When something unexpected happens, stop and tell the user.

## Workflow

1. Check tools
2. Pick the project
3. Set up `comment.json`
4. Run preflight
5. Choose pages
6. Comment, one page at a time
7. Report

### 1. Check tools

1. Call `list_projects`. If `isPro` is false, stop: both comment tools return
   `pro_required`.
2. If the MCP is missing or unauthorised, point the user to the setup in
   this skill's README.md.
3. Name the browser tool you will use. No browser tool: stop.

### 2. Pick the project

Same as the submit skill: match the product URL against `list_projects` by
`domain`, then by name; confirm the match with the user; create one with
`create_project` only when there is no match. If `profile.json` exists in the
workspace, its `product.url` is the product URL.

### 3. Set up `comment.json`

The file is `./.wheretosubmit/comment.json`. Schema and every field:
[templates/comment.json](templates/comment.json) (the `_help` keys explain
each one). It holds:

- `identity`: the name, email and website typed into every form. Real,
  fixed, one per project. Ask the user for each missing value; never make one
  up. The name is a person's name, not the product's. The email is a mailbox
  the user owns on a normal provider; a disposable address gets the comment
  flagged. The website is the product URL.
- `pages`: the product pages that may be linked, each with `url`, `about`
  (one line, what the page covers) and `topics` (what kinds of posts it fits).
  Draft this list from the product's blog, guides and docs if the user has
  not filled it, and show it to them.
- `styleExamples`: three to five comments in the voice you must match. Draft
  them from `pages` following
  [references/comment-writing.md](references/comment-writing.md) and have
  the user approve them. They are examples of tone and shape, never text to
  reuse.
- `linkInBody`: `"always"` (default), `"when-no-website-field"` or `"never"`.
- `hrefBreak`: `false` by default. When the user asks for dofollow comments
  in chat ("dofollow", "提交 dofollow 类型的评论", "要 dofollow"), treat it as
  `true` for that run and say so in the plan; write it back to the file only
  if they say it should stay on. See comment-writing.md.
- `usedAnchors`: anchor texts already used, kept by the skill. Never reuse one.
- `run`: `count` (default 10, max 25) and `pace` (`normal` or `careful`).

The user can change any of this at any time, in the file or in chat ("use a
different name from now on"). Chat wins for that run; write the change back
to the file.

### 4. Run preflight

```
node <skill-folder>/scripts/preflight.mjs --dir <workspace>
```

Exit 0 means ready. Exit 1 lists blocking problems (missing identity,
disposable email, no pages, bad URLs): fix them with the user and run again.

### 5. Choose pages

1. Ask how many pages (default `run.count`) and whether to focus on a
   category.
2. Call `next_comment_targets` with the project id, `limit`, and optionally
   `category` or `minAs`. The result is already one page per domain and
   skips domains with any mark. Do not pass `onePerDomain: false` unless the
   user asks for a second comment on a domain they named.
3. Show the plan (domain, URL, score, category) and get one go-ahead. After
   that, work through the list without asking per page, except where a rule
   says ask.
4. Note the time you started.

### 6. Comment, one page at a time

For each page, in a new tab:

1. **Open the page.** Wait up to the load timeout. Dead page, error page,
   login wall, or a page that is not an article: outcome `unusable`.
2. **Read the post.** Take the article text only (not navigation, sidebar,
   footer, existing comments). Under about 120 characters of article means
   there is nothing to respond to: outcome `unusable`, reason "no article".
   Note the post's language.
3. **Find the comment form**, following
   [references/form-rules.md](references/form-rules.md). Scroll to the
   bottom; wait for lazy-loaded comment sections. No form, "comments are
   closed", a third-party widget, or a login requirement: `unusable`.
   Email verification required before posting: `unusable`.
4. **Check for an existing comment** by the identity's name on the page. If
   it is there, outcome `approved` with its URL, and move on.
5. **Pick the link.** Choose the entry in `pages` whose `topics` best match
   the post. No honest match: pick the closest page and keep the link mention
   light (see comment-writing.md), or, if nothing fits at all, skip the page
   with outcome `skipped-no-fit` (no mark).
6. **Decide the placement.** By default (`linkInBody: "always"`) the link
   goes in the body as one `<a href>` inside a sentence near the end, and the
   website field, when present, gets the product URL as well. With
   `"when-no-website-field"` the body link is used only on forms without a
   website field; with `"never"` the body never carries a link.
7. **Write the comment** following comment-writing.md: the post's language,
   250 to 400 characters, a specific observation first, no flattery, at most
   one link in the body, an anchor that passes every check. Run the
   self-check list.
   Fail twice: skip the page with `skipped-ai-failed` (no mark).
   Dofollow mode (`hrefBreak` true, or the user asked for dofollow
   comments): write the body link with the line break before the closing
   quote of the href, exactly as shown in comment-writing.md, and keep it when
   filling the textarea (set the field value, or type it with a real newline;
   Enter inside a textarea does not submit).
8. **Fill** name, email, website and the comment body, in that order, with
   the fill delay between fields. Leave every other field alone unless it is
   required; a required field you cannot honestly fill (phone, address, a
   question you cannot answer) means `unusable`.
9. **CAPTCHA present:** stop before submitting, tell the user which tab, and
   wait. The user submits. If they say they did, read the result as below. If
   `allowCaptchaHandoff` is false, outcome `skipped-captcha` (no mark).
10. **Submit** with the form's own submit control, wait the settle delay,
    then read the result:
    - the comment is visible on the page: `approved`; note its URL (the
      `#comment-…` anchor if there is one, otherwise the page URL);
    - the page says the comment awaits moderation or review, in any language:
      `submitted`; note the page URL;
    - the page says it was rejected, flagged as spam, or shows an error
      about the content: `rejected`;
    - nothing visible changed, no message, the form is still filled: do not
      submit again; outcome `unknown` (no mark), note the time.
11. **Dofollow check**, only when the comment is visible: look at the
    rendered link in the page source and record `dofollow` when it has no
    `rel="nofollow"` and no `rel="ugc"`, otherwise the rel it carries. Also
    check the href came through intact (the line break is gone, the URL is
    whole); a broken href is a `rejected` for the report's purposes, note why.
12. **Mark** right away with `mark_comment` (one call per page is fine; up to
    25 per call). Only `approved`, `submitted`, `rejected` and `unusable` are
    marked; skipped and unknown outcomes are not, so the page comes back next
    run.
13. **Record** the page in the local report (see below) whatever the
    outcome, and add the anchor text to `usedAnchors` if a body link was used.
14. **Pause** between pages: the between-pages delay from form-rules.md.

#### Which mark to write

| Outcome | mark_comment status |
| --- | --- |
| Comment visible right away, or already there | `approved` |
| Page says awaiting moderation | `submitted` |
| Site refused it (spam notice, content error) | `rejected` |
| No form, closed, third-party widget, login or email verification, dead page, no article, required field you cannot fill | `unusable` |
| Skipped (captcha not allowed, no fitting page, could not write a passing comment) | no mark |
| Outcome unknown | no mark |

### Stop and ask the user

- a page asks for payment or registration;
- a required fact is missing from `profile.json` and `comment.json`;
- the browser shows a download, a permission prompt or a page that looks unsafe;
- three pages in a row fail the same way (likely a browser or network problem);
- the site shows a message that your email or name is blocked: stop the run
  entirely, since the identity may be flagged.

### 7. Report

`<workspace>/report.html` is shared with the submit skill. Its data block
has two keys: `sites` (directory marks, owned by the submit skill) and
`comments` (owned by this skill). Read the current file, keep `sites` and
every existing `comments` entry, append this run's entries, and write the
file back; copy `templates/report.html` from the submit skill first if the
file does not exist. Never drop another run's entries.

One entry per page touched:

```json
{
  "domain": "example.com",
  "pageUrl": "https://example.com/post",
  "status": "submitted",
  "commentUrl": "https://example.com/post#comment-4821",
  "placement": "body",
  "anchor": "",
  "rel": "",
  "body": "The first sentence of the comment…",
  "note": "",
  "postedAt": "2026-11-03T08:12:00Z"
}
```

- `status`: the mark, or `unmarked (<reason>)` for skipped and unknown.
- `commentUrl`: the comment anchor or the page URL; empty when nothing was
  posted.
- `placement`: `body` (link in the text, the default) or `website-field`.
- `anchor`: the anchor text when the link was in the body.
- `rel`: `dofollow`, `nofollow`, `ugc` or empty when the comment is not
  visible yet.
- `body`: the full comment text as posted (no secrets are involved).

End every run with this, in the user's language, then the report path:

```
Run summary: <n> pages tried, <a> approved, <s> submitted, <r> rejected, <u> unusable, <k> skipped or unknown.

| Domain | Status | Comment | Placement | rel |
| --- | --- | --- | --- | --- |
| example.com | submitted | https://example.com/post | body | |

Report: .wheretosubmit/report.html

Needs you:
- [ ] Captcha tabs to finish: <domain, tab>
- [ ] Outcome unknown: <domain, time>
- [ ] Questions: <what you need answered>
```

Leave out empty checklist lines.

## References

- [references/comment-writing.md](references/comment-writing.md): what a comment must look like, anchor rules, link placement, href line break
- [references/form-rules.md](references/form-rules.md): finding the form, honeypots, CAPTCHA markers, submit button, timeouts and pacing
- `templates/comment.json`: identity, pages, style examples, run settings
- `scripts/preflight.mjs`: checks `comment.json` (`--dir`, `--json`)
