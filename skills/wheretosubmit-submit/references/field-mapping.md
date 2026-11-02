# Field mapping

Map the profile to the form the site actually shows, by meaning, at the time
you fill it. Field names, labels and limits change; do not rely on what
`get_site` or an earlier run said about the form.

## 1. Read the whole form first

1. Scroll to the end of the form before typing anything. Note every field, which
   ones are required, every length counter, every upload, and the final button.
2. Look for steps: "Next", tabs, a pricing step, a checkout. Many "free" forms
   show the price only on the last step.
3. Check three guards. If any fails, this is not a submission form; stop and
   classify the page instead (see gates.md):
   - There is a field for the product URL. A form with no URL field is usually a
     newsletter or contact box.
   - The final control reads like a submit action (Submit, Send, Add, Post,
     Publish, Next, or the same in another language).
   - The form is about listing a product, not hiring the site owner or buying ads.

## 2. The four cases

| Site field | Profile | Action |
| --- | --- | --- |
| present | has it | fill, trimmed to the site's limit |
| required | lacks it | derive if possible; else check `extra`; else ask the user once and save to `extra` |
| optional | lacks it | leave empty |
| absent | has it | ignore; never stuff it into another field |

"Derive" means a fact that follows from the profile without guessing: the
domain from `product.url`, first and last name from `founderName`, "Is it
free?" from `pricing.model`. A founding year, team size, revenue, user count
or address is never derived.

If a required field is in `permissions.neverShare` (phone, street address,
tax id, registration number), do not ask; the site is `personal-contact` and
gets skipped, see gates.md.

When you have to ask, ask everything the current site needs in one message,
and suggest saving each answer to `extra` under a camelCase key.

## 3. Text length

1. Find the limit: a counter, a `maxlength`, a hint ("max 160 characters"),
   or a validation error after typing.
2. Pick the longest variant in `copy.<lang>` whose declared limit is at or
   under the site's limit. `tagline60` fits a 60 or 80 limit; `short160` fits 200.
3. If none fits, shorten the next longer variant: drop whole sentences and
   clauses, then shorten wording. Do not add anything that is not already in
   the profile. Save the result back as a new key (`short120`) so it is reused.
4. Word limits: count words, not characters. "20 to 30 words" means both bounds.
5. If the site asks for neutral or editorial text, or says "do not use we",
   use an `impartial*` variant.
6. Plain text only unless the field shows a rich text toolbar. No markdown
   symbols in plain text boxes.
7. Never type more than the limit and let the site cut it.

## 4. Language

Use `copy.<lang>` matching the site's language when it exists. If the site
accepts English, use English. If it only accepts another language and the
profile has no copy for it, ask the user whether to translate; if they agree,
save the translation as `copy.<lang>` and have them confirm it.

## 5. Common fields

| Form asks | Use |
| --- | --- |
| Name, product name, tool name | `product.name` |
| Website, URL, link | `product.url` exactly. No tracking parameters unless the user asks for them |
| Tagline, slogan, one-liner | `tagline60` or `tagline100` |
| Short / long description | longest `copy` variant that fits |
| Category (dropdown) | closest option to `product.categories[0]`; if none is close, try the next category; "Other" only as a last resort |
| Sub-category, multi-select | up to the allowed number, closest options first |
| Tags, keywords | `product.tags`, in the site's format (comma list or chips) |
| Pricing (dropdown) | map `pricing.model`: free → Free; freemium → Freemium (or Free if no Freemium); free-trial → Free Trial; paid → Paid; open-source → Open Source (or Free); contact → Contact for pricing (or Paid) |
| Price, starting price | `pricing.startingPrice`; leave empty if null |
| Platforms, OS | `product.platforms`; tick only what is listed |
| Logo, icon | `assets.logoSquare`; if the site needs a smaller file and you have no smaller one, ask |
| Cover, banner, thumbnail | `assets.ogImage`, or `logoWide` for wide banners |
| Screenshots, gallery | `assets.screenshots` in order |
| Video | `assets.demoVideoUrl` |
| Your name | `contact.submitterName`, else `founderName` |
| Founder, maker | `contact.founderName` |
| Email | `contact.email` |
| Role, job title | `contact.role`; leave empty if null and optional |
| Twitter, GitHub, LinkedIn ... | matching `links.*` |
| Launch date | `product.launchedAt`; leave empty if null and optional |
| Company name | `extra.companyName` if saved; else ask if required |
| How did you hear about us | answer truthfully; pick "Other" or "Search" when unsure |
| Anything else / message to the editor | leave empty unless required; if required, one short sentence from `short160` |

## 6. Checkboxes and hidden fields

- Leave newsletter, marketing and partner opt-ins unticked.
- A required "I agree to the terms / guidelines" box may be ticked when the
  terms describe a normal free listing. If they mention fees, renewals,
  exclusive rights or a required backlink you did not expect, stop and ask.
- Never fill fields that are hidden from people (honeypots). Fill only what a
  human would see.
- Leave "featured / priority / expedited review" upgrades unselected unless
  `allowPaid` is true and the user asked for them.

## 7. After filling

1. Re-read every filled field. Check no field got the wrong value from
   autofill and no text got cut.
2. Click the real submit control. Do not trigger submit in other ways.
3. Wait for the result and read it; see evidence.md for what counts.
