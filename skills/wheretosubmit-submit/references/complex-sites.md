# Complex sites

Status: outlines, to be refined after real runs. Site rules change often;
when the site's own help pages disagree with this file, follow the site and
tell the user what changed.

Some sites are not a single form. They need an account, several steps,
timing, and follow-up over days or weeks. A rushed or botched entry on these
sites is hard to undo, so:

1. Read `get_site` tips and submission method, and the site's guide on
   wheretosubmit.org if there is one (`https://wheretosubmit.org/guides`).
2. Follow the outline below. Do not improvise a multi-step launch.
3. Ask the user before any step that publishes, schedules, or commits them
   to a date.
4. These sites almost always need an account. With `allowRegistration` false,
   work only in a session where the user is already signed in, or prepare
   everything and hand over.

## Product Hunt (producthunt.com)

Gates: account (a personal maker account; company accounts cannot post),
plus timing. Treat it as a launch, not a directory entry.

Before anything:

1. Check for an existing post: search Product Hunt for the product name and
   domain. A product can have earlier launches; a new launch needs a real
   update, not a repost.
2. Confirm with the user: launch date, who is the maker (their account),
   and whether they will be online on launch day to reply to comments.

Prepare (in chat or a draft file, for the user to approve):

1. Name: `product.name`.
2. Tagline: `tagline60`. 60 characters max, no emoji spam, no "best".
3. Description: the form shows its own limit (it has been 260 characters);
   use the longest fitting variant.
4. Topics: up to 3, closest to `product.categories`.
5. Thumbnail: square logo, 240x240 or larger (an animated GIF is allowed).
6. Gallery: at least 2 images, 1270x760 recommended, first image is the one
   people see most. Use `assets.screenshots`; ask for more if there are fewer than 2.
7. Video: `assets.demoVideoUrl` if any.
8. Pricing: Free, Paid, or Paid with free trial or plan, from `pricing.model`.
9. Makers: the user's account; other team members only if the user names them.
10. First comment (maker comment): who made it, why, what it does, what is
    free, what feedback is wanted. Draft it from the profile in the user's
    voice; the user approves it before it goes up.

Submit:

1. In the user's signed-in session, open the new-post flow and fill it with the
   approved material.
2. Choose "schedule" with the date the user gave. Launches go live at
   12:01 a.m. Pacific time. Do not press the final Schedule or Launch button
   until the user says so.
3. Mark `submitted`, `followup: "awaiting_review"`, evidence "scheduled for
   <date>, post <url>".

Rules on Product Hunt:

- No upvote rings, vote swaps, paid votes, or new accounts made to vote.
- Do not message people asking for upvotes. Asking people to "check it out"
  or give feedback is fine.
- Do not post the same product twice in a short time.

After launch day:

1. The post is live: mark `approved` with the post URL, no followup.
2. Draft replies to comments only if the user asks; the user posts them.

## G2 (g2.com)

Gates: account and personal-contact. G2 wants a business email on the
product's domain and real company details. Listing is free; G2 sells paid
plans on top, which you ignore unless `allowPaid` is true.

Before anything:

1. Search G2 for the product name and domain. G2 sometimes creates profiles
   on its own. If one exists, the path is "claim", not "add".
2. Check that `contact.email` is on the product's domain. If not, tell the
   user; G2 will likely refuse a free-mail address.
3. Ask the user for any company facts the profile lacks (company name,
   headquarters country, founding year), and save them to `extra`.

Claim or add:

1. Existing profile: use G2's claim flow from the profile page, in the user's
   signed-in session. G2 verifies by business email.
2. No profile: use G2's free "get listed" form for vendors. Fill product
   name, URL, the closest G2 category, company details and the business email.
3. G2 reviews requests by hand; this can take days or weeks.
4. Mark `submitted`, `followup: "awaiting_review"`, evidence with the
   confirmation text.

Profile (after G2 grants vendor access):

1. Description from `medium500` / `long1500`.
2. Screenshots, logo, video from `assets`.
3. Pricing editions from `pricing`; leave out anything not on the
   product's pricing page.
4. Categories: G2 categories have entry rules; pick the ones the product
   meets, not the ones with the most traffic.

Reviews:

- Never write a review, and never ask the user, staff or friends to
  pose as customers.
- Real customers can be invited through G2's own review invitation tools;
  G2 decides which incentives are allowed. That is the user's job, not yours.
- A listing with no reviews is still a listing. Mark `approved` with the
  profile URL once it is public.

## Capterra-type marketplaces (Capterra, GetApp, Software Advice and similar)

Status: rough outline.

1. These share a vendor portal and a business-email check, much like G2.
2. The free basic listing is often below paid placement offers. Take the
   free path; ignore paid upsells unless `allowPaid` is true.
3. One vendor submission can produce listings on several sister sites. Mark
   each site in the MCP only when you see the listing live on that site.
4. Expect manual review and questions by email. Mark `submitted` with
   `followup: "awaiting_review"`.
