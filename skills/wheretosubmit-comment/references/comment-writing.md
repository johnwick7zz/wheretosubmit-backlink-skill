# Writing the comment

A comment that reads like a reader wrote it gets approved. A comment that
reads like a link drop gets deleted, and a few of those get the identity
flagged by Akismet on every WordPress site at once. So the rules below are
not style preferences; they are what keeps the identity usable.

## Shape

- Language: the post's language, always. A Spanish post gets a Spanish
  comment, anchor included. Never mix.
- Length: 250 to 400 characters including any HTML. Never over 400.
- Open with one or two specific observations about the post: a detail, a
  number, an argument, an example from the text. It must be obvious you read
  it. Add something: a number the post left out, a related gotcha, what
  happened when you tried it. The `styleExamples` in `comment.json` show the
  density expected: a concrete fact per sentence.
- At least three quarters of the comment is about the post. The link, if
  any, is an aside at the end, one short clause or sentence.
- Plain, conversational, first person is fine. No "Great article", "Thanks
  for sharing", "Nice post", no flattery, no exclamation marks, no emoji, no
  hashtags, no sign-off, no greeting line, no quotation marks around it.
- Nothing salesy. The product is never "the best", never "free", never
  recommended; it is mentioned as something you use or built.
- Only facts you have: from the post, from `profile.json`, from the `about`
  line of the page you link. Never invent what the linked page covers, never
  invent numbers.

## Choosing the link

`comment.json` lists the pages that may be linked, each with `about` and
`topics`. Pick the page whose topics overlap the post. The overlap has to be
real: a shared problem, a step the post mentions, a need the post raises.

- Real overlap: connect through it ("the publisher widths in that post
  match what I keep in …").
- No real overlap: bring the page in lightly as something you use or made
  ("I've been keeping notes on … lately, in case it helps anyone here"), one
  sentence, no claim that it covers the post's topic.
- Nothing fits at all (a recipe blog, a sports post, when the product is a
  lab tool): skip the page. Do not force it.

## Placement

The link goes in the comment body, as HTML, on every comment. That is the
default (`linkInBody: "always"`): the anchor text is the backlink, so the
anchor rules below are what the whole skill rests on. When the form also has
a Website field, fill it with the product URL; it becomes a second, nofollow
link on the name and costs nothing.

`linkInBody: "when-no-website-field"` puts the link on the name only and
leaves the body without a link wherever a Website field exists;
`"never"` keeps the body link-free everywhere. Both are opt-outs.

Body link format:

```
… <a href="https://example.com/blog/figure-sizes">a short note on figure sizes</a> …
```

One link, that exact URL, inside a sentence near the end, never as the first
sentence, never as the whole sentence, never markdown, never a bare URL.

## Anchor text

The anchor is the first thing both the spam filter and the moderator look
at. Every one of these is checked before submitting:

1. Two to eight words (CJK: count two characters as a word), a plain
   descriptive phrase that says what the reader will find: "a short write-up
   on nofollow links", "the checklist I use for submissions", "notes on
   static build times".
2. Reads as part of the sentence. Strip the HTML and the sentence still
   makes sense.
3. Describes the linked page truthfully, from its `about` line.
4. Not generic: never "click here", "here", "this", "this site", "this
   page", "read more", "learn more", "check it out", "my site", "my
   website", "my blog", "source", "link", "点击这里", "这里", "查看", "更多".
5. Not a money keyword and not the product or brand name on its own.
   "scientific figure generator" or "SciFig" as the whole anchor is exactly
   what gets flagged.
6. No sales words: best, cheap, buy, top, discount, free, review, 最好,
   便宜, 优惠, 免费.
7. Not an address: no `http`, no `www`, no domain.
8. Not ALL CAPS, not ending in punctuation.
9. Same language as the comment.
10. Not in `usedAnchors`. Every comment gets a new anchor, written from that
    post's overlap with the page. Add it to `usedAnchors` after posting.

## Self-check before filling

Run this list on the finished text. Any failure: rewrite once. A second
failure: skip the page, no mark.

- language matches the post;
- 250 to 350 characters;
- first sentence is about the post, not about the link or the product;
- no banned opener, no exclamation mark, no emoji;
- link count is exactly 1 (or 0 only under the website-field opt-outs);
- the body link is `<a href="…">…</a>` with the exact URL from `pages`;
- anchor passes all ten anchor rules;
- nothing stated about the linked page beyond its `about` line.

## Good and bad

Good (default, link in the body; English post about build caches):

```
The part about build caches being invalidated by every image change matches what I hit on a site with a couple thousand pages. Moving the resize step out of the main build fixed most of it for me. I wrote down the other things that helped in <a href="https://example.com/blog/static-build-times">a short note on static build times</a>, in case anyone here runs into the same wall.
```

Good (`when-no-website-field` opt-out on a form with a Website field, same post):

```
The part about build caches being invalidated by every image change matches what I hit on a site with a couple thousand pages. Moving the resize step out of the main build cut the time roughly in half; the rest came from caching the resized output between runs. Did you measure how much was the resize itself versus writing the files?
```

Bad:

- "Great article, thanks for sharing! Check out https://example.com" (generic opener, flattery, bare URL)
- "I agree. <a href="…">click here</a> for more." (says nothing about the post, generic anchor)
- "Solid breakdown. <a href="…">Best Static Site Hosting 2026</a> covers the rest." (keyword-stuffed, salesy anchor, link is the point)
- "Interesting read. [my notes](…)" (markdown)
- "Nice post!!! 🔥" (nothing, exclamation, emoji)

## `hrefBreak`: a line break inside the href

WordPress adds `rel="nofollow"` to comment links with a regular expression
that does not match across lines. A real line break at the end of the href
value, before the closing quote, makes that regex skip the tag, and
browsers drop the line break when they resolve the URL, so the link still
works:

```
<a href="https://example.com/blog/figure-sizes
">a short note on figure sizes</a>
```

This only applies to a link in the comment body; the Website field is
always nofollow. It depends on the site's WordPress version and plugins, so
it may do nothing, and a site with a stricter filter may strip the tag or
hold the comment. Use it when `hrefBreak` is `true` in `comment.json`, or
when the user asks for dofollow comments in chat for this run.

How to write it: finish the comment normally, then put one real line break
(`\n`) between the end of the URL and the closing quote of the href. Nothing
else changes: one link, same anchor rules, same length limit (the line break
counts as one character). When filling the textarea, make sure the line
break survives: set the field's value directly, or type it with a real
newline; Enter inside a textarea inserts a newline and does not submit.

After submitting, if the comment is visible, open the page source and look at
the rendered link: record `dofollow` when it has no `rel="nofollow"` and no
`rel="ugc"`, otherwise the rel it carries; and confirm the href is whole. Put
that in the report's `rel` column, so the user can see on which sites it
worked. Leave `hrefBreak` `false` in the file unless the user wants it on by
default.
