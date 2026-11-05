# Profile schema: `wheretosubmit-profile/v1`

The profile is one JSON file, `profile.json`, in the workspace folder
(default `./.wheretosubmit/`). It holds everything a directory form can ask
about the product. It never leaves the user's machine; the Where To Submit
server only stores progress marks.

Start from `templates/profile.json`. Check it with
`node scripts/preflight.mjs --dir <workspace>`.

## Conventions

- Keys that start with `_` are notes for humans and are ignored.
- A string that starts with `TODO` counts as missing.
- `null` means "does not apply" or "unknown". Never guess a value to replace a null.
- Paths in `assets` are relative to the workspace folder.
- No secrets outside `accounts`: no API keys, card numbers, or one-time codes anywhere; passwords only under `accounts`, and the whole `.wheretosubmit/` folder stays out of git.

## Tiers

| Tier | What preflight does | Fields |
| --- | --- | --- |
| core | blocks the run if missing or invalid | `product.name`, `product.url`, a `copy.en.tagline<N>`, `contact.email`, `assets.logoSquare` |
| common | warns if missing | `copy.en.short160`, `medium500`, `long1500`, `product.categories`, `product.tags`, `pricing.model`, `assets.screenshots`, a contact name, at least one `links.*` |
| extra | not required | anything under `extra` |

Preflight also blocks on: wrong `schema` id, wrong types, any text longer
than its declared limit, an asset path that points to a missing file, a logo
that is not square or is under 512 px.

## Sections

### Top level

| Key | Type | Notes |
| --- | --- | --- |
| `schema` | string | must be `wheretosubmit-profile/v1` |
| `updatedAt` | `YYYY-MM-DD` | preflight warns after 120 days |
| `source` | string | where the facts came from (pages read, date, who confirmed) |

### `product`

| Key | Type | Notes |
| --- | --- | --- |
| `name` | string | core. Up to 80 characters |
| `url` | http(s) URL | core. Root URL of the product, not a deep page |
| `alternateNames` | string[] | other spellings, used for the existing-listing search |
| `pricingUrl` | URL or null | |
| `launchedAt` | `YYYY-MM-DD` or null | only if known |
| `platforms` | string[] | Web, iOS, Android, macOS, Windows, Linux, Chrome extension, API ... |
| `categories` | string[] | your own words, most important first. Mapped to each site's list live |
| `tags` | string[] | short keywords |
| `audience` | string[] | who it is for |
| `languages` | string[] | languages the product UI supports |

### `copy`

One object per language. `en` is required. Add another language (`zh`,
`fr`, `es` ...) only with real copy; the agent does not translate on its own.

Each key is `<kind><maxChars>`. The number is a hard limit in characters
(Unicode code points). Preflight blocks any text over its limit.

| Key | Purpose |
| --- | --- |
| `tagline60` | one line. Product Hunt and many directories cap at 60 |
| `tagline100` | one line for sites that allow more |
| `short160` | one or two sentences; meta-description size |
| `medium500` | short paragraph |
| `long1500` | full description |
| `impartial160`, `impartial500` | third person, no "we/our/us", no hype. For sites that ask for neutral or editorial text |
| `useCases300` | what people use it for |
| `whyUnique300` | what is different |

Add other lengths whenever a site's limit falls between two variants
(`short250`, `medium800`). The agent may add these itself when it shortens
text for a site, so the next site with the same limit reuses it. Keys without
a number (`benefits`) are allowed but preflight warns, because the agent
cannot tell which limit they fit.

Word limits ("20 to 30 words") are checked by the agent at fill time; store
such text under the nearest character key, or ask the user.

### `pricing`

| Key | Type | Notes |
| --- | --- | --- |
| `model` | enum | `free`, `freemium`, `free-trial`, `paid`, `open-source`, `contact` |
| `startingPrice` | string or null | free text, e.g. `$9/mo` |
| `hasFreeTrial` | boolean | |
| `requiresCard` | boolean | card needed to start |

### `assets`

| Key | Type | Notes |
| --- | --- | --- |
| `logoSquare` | path | core. PNG, JPEG, GIF or WebP, exactly square, at least 512x512; or SVG |
| `logoWide` | path or null | horizontal logo with the name |
| `ogImage` | path or null | 1200x630 cover image |
| `screenshots` | path[] | 1270x760 or larger works for most sites |
| `demoVideoUrl` | URL or null | YouTube or Loom link |

Assets live in `<workspace>/assets/`. Preflight reads the image headers to
check sizes.

### `contact`

| Key | Type | Notes |
| --- | --- | --- |
| `email` | email | core. The mailbox the agent must be able to read |
| `submitterName` | string or null | typed into "Your name" |
| `founderName` | string or null | for "Founder" / "Maker" fields |
| `role` | string or null | e.g. Founder. Leave null if the user did not give one |

### `links`

Full URLs or null: `twitter`, `linkedin`, `github`, `producthunt`,
`youtube`, `discord`, `docs`, `changelog`. Other keys are allowed.

### `accounts`

Optional. Used only when `permissions.allowRegistration` is true. Everything
here stays on the user's machine.

| Key | Type | Notes |
| --- | --- | --- |
| `default.email` | email or null | the account the agent registers or signs in with on directories |
| `default.password` | string or null | null = use the Google/GitHub session already open in the browser for that email, else ask once |
| `default.username` | string or null | for sites that want a handle |
| `mailbox.url` | URL or null | webmail to open for verification codes; null = pick from the email's domain (163, 126, QQ, Gmail, Outlook) |
| `mailbox.email` / `mailbox.password` | string or null | null = reuse `default` |
| `sites` | map | per-domain overrides `{ "<domain>": { email, password, username, note } }`, written by the agent when a site forced a different credential |

The agent never invents a password and never writes credentials into
`evidence`, chat or the report. See gates.md (account) and
email-verification.md (webmail).

### `permissions`

| Key | Default | Meaning |
| --- | --- | --- |
| `allowRegistration` | `false` | may register or sign in on directories with the credentials in `accounts`, and may log into the webmail to read codes |
| `allowCaptchaHandoff` | `true` | may fill a form and hand the CAPTCHA to the user; the agent never solves it |
| `allowPaid` | `false` | may take a paid listing to the checkout page and hand it to the user; the agent never enters payment details |
| `neverShare` | `["phone", "streetAddress", "taxId", "companyRegistrationNumber"]` | fields never filled, even when required; such sites are skipped |

The user can override any of these for one run in chat. Chat instructions win
over the file for that run only.

### `extra`

Free map of answers the agent had to ask for. Key is the question in
camelCase, value is a string, number or boolean.

```json
"extra": {
  "foundedYear": 2025,
  "teamSize": "1-10",
  "headquartersCountry": "Germany",
  "isOpenSource": false
}
```

Before asking the user anything, the agent checks `extra` first. After asking,
it writes the answer here so it never asks twice.

## Migrating an older profile

If preflight reports a schema mismatch, copy the template next to the old
file, move each fact into the matching key, rename text keys to carry their
real limit, and run preflight until it reports READY. Do not delete the old
file; leave that to the user.
