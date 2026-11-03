# Forms, safety and pacing

These rules come from the Where To Submit browser extension, which has run
this flow on hundreds of blogs. Follow them as written.

## Finding the comment form

1. Scroll to the bottom of the article. Comment sections often load lazily;
   wait up to the form-wait delay for one to appear.
2. Known systems, in order: WordPress (`#respond`, `#commentform`,
   `wp-comments-post`), wpDiscuz, Typecho, Z-Blog, Commento, Isso,
   Waline/Valine. Their forms have a textarea for the comment and inputs for
   author, email and url.
3. Unknown template: look for a form near the bottom with a textarea whose
   name, id, placeholder or label says comment, reply, message, 评论, 留言,
   コメント, comentario, commentaire, Kommentar, комментарий, and text
   inputs for name, email, website. Search boxes, newsletter forms, login
   forms and password fields are not it.
4. Third-party systems in a cross-origin iframe (Disqus, Facebook
   Comments, Giscus, utterances, Hyvor) need an account. Skip the page,
   outcome `unusable`.
5. "Comments are closed" (any language), no form at all, or a form that
   says you must log in or register: `unusable`.
6. A notice that a verification email will be sent before the comment is
   accepted: `unusable`. This skill does not read mail.

## Fields

- Fill only: author name, email, website, comment body. Nothing else unless
  it is required.
- A required field you cannot honestly fill from `profile.json` or
  `comment.json` (phone, address, company, a question you cannot answer):
  `unusable`.
- A checkbox for "save my name for next time" can stay as it is. A
  checkbox for a privacy or terms agreement that is required may be ticked.
  A newsletter checkbox is never ticked.
- Honeypots: never type into an input that is hidden (`display:none`,
  `visibility:hidden`, `type=hidden`, `aria-hidden`), has zero size, or
  sits outside the viewport. Filling one marks the comment as a bot.
- Overwrite nothing the user typed by hand in a tab they took over.

## CAPTCHA

Markers: `.g-recaptcha`, `iframe[src*="recaptcha"]`, `.h-captcha`,
`iframe[src*="hcaptcha"]`, `.cf-turnstile`,
`iframe[src*="challenges.cloudflare.com"]`, `.frc-captcha`, and any input
whose name or label says captcha, verif, security code, antispam, 验证码,
or a small arithmetic question.

When one is present and `permissions.allowCaptchaHandoff` is true in
`profile.json`: fill the form, do not touch the CAPTCHA, tell the user which
tab, and wait for them to finish. Then read the result as usual. When it is
false: outcome `skipped-captcha`, no mark.

## Submit button

Only inside the comment form, never elsewhere on the page. Prefer
`button[type=submit]` or `input[type=submit]`. A button without a type is
acceptable when its text is post, submit, send, publish, reply, comment,
发表, 提交, 发布, 回复, 留言, envoyer, publier, commenter. Never press a
button whose text says cancel, reset, clear, preview, close, subscribe,
search, log in, sign up, register, upload. No usable button: `unusable`.

## Timeouts and pacing

| Step | normal | careful |
| --- | --- | --- |
| page load timeout | 25 s | 25 s |
| wait for the comment form to appear | 8 s | 8 s |
| after the page is ready, before typing | 1.5 s | 4 s |
| between fields | about 1 s | about 2 s |
| after the last field, before submit | 2.5 s | 6 s |
| after submit, before reading the result | 3 s | 3 s |
| between pages | 30 to 90 s, varied | 60 to 180 s, varied |

`run.pace` in `comment.json` picks the column. Use `careful` for sites that
have flagged a comment before, or when the user says so. The between-pages
pause matters most: ten comments from one identity inside a minute is the
pattern Akismet is built to catch.

A page that does not finish loading inside the timeout: outcome
`failed-load`, no mark, move on. Three in a row: stop and tell the user.

## Reading the result

After submit, the page usually does one of these:

- reloads with the new comment in the list, often with an anchor like
  `#comment-4821` in the URL, sometimes with "Your comment is awaiting
  moderation" above it;
- shows a message only: "awaiting moderation", "pending approval", "will
  appear after review", "Tu comentario está pendiente de moderación", "Votre
  commentaire est en attente", "コメントは承認待ちです", "您的评论正在等待审核";
- shows an error: duplicate comment, too fast, missing field, blocked word,
  "looks like spam";
- changes nothing.

Comment visible → `approved`. Moderation message, with or without the
comment visible → `submitted`. Spam or block error → `rejected`. Missing
field error → fix it once and resubmit; a second error → `unusable`.
Nothing changed → `unknown`, no mark, never resubmit.

A message that the email or name is blocked, or "you have been flagged": stop
the whole run and tell the user. The identity may be on a list.

## Outcomes and marks

| Outcome | Cause | mark_comment |
| --- | --- | --- |
| `approved` | comment visible | `approved` |
| `submitted` | awaiting moderation | `submitted` |
| `rejected` | site refused the content | `rejected` |
| `unusable` | the page cannot take this comment (no form, closed, widget, login, email verification, dead, no article, required field) | `unusable` |
| `skipped-captcha` | CAPTCHA and handoff not allowed | none |
| `skipped-no-fit` | no linked page fits the post | none |
| `skipped-ai-failed` | could not write a passing comment in two tries | none |
| `failed-load` | timeout or browser error | none |
| `unknown` | submitted, nothing visible | none |

Marks only describe the page. Our own failures are not marked, so the page
comes back in a later run instead of disappearing.
