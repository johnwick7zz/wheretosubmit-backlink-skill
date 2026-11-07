// Classifies one fetched submit page for probe.mjs. Pure functions over the
// response status, final URL and HTML text; nothing here touches the network.
//
// The result is a sorting hint for the agent, not a verdict: a React page
// may hide its form from plain HTML, a "$" in a footer is not a paywall.

/** @typedef {'form' | 'login' | 'paid' | 'captcha' | 'blocked' | 'dead' | 'no-form' | 'unknown'} ProbeClass */

/**
 * @typedef {{
 *   url: string,
 *   domain: string,
 *   status: number | null,
 *   finalUrl: string | null,
 *   error: string | null,
 *   html: string,
 * }} Fetched
 */

/**
 * @typedef {{
 *   url: string,
 *   domain: string,
 *   class: ProbeClass,
 *   status: number | null,
 *   finalUrl: string | null,
 *   signals: string[],
 * }} ProbeResult
 */

/** Order in which classes are listed: easiest to submit first. */
export const CLASS_ORDER = /** @type {ProbeClass[]} */ (['form', 'unknown', 'captcha', 'login', 'paid', 'no-form', 'blocked', 'dead']);

const LOGIN_PATH = /\/(log-?in|sign-?in|sign-?up|register|auth|account|dashboard|users?\/sign)(\/|$|\?)/i;
const PARKED = /domain (is )?for sale|this domain (has been|is) (registered|parked)|sedoparking|parkingcrew|buy this domain|godaddy\.com\/forsale|hugedomains/i;
const CHALLENGE = /just a moment|attention required|checking your browser|cf-browser-verification|access denied|ddos-guard|verify you are human/i;
const CAPTCHA = /recaptcha|hcaptcha|turnstile|cf-turnstile|g-recaptcha|captcha/i;
const JS_APP = /id="(root|__next|app|__nuxt)"|data-reactroot|__NEXT_DATA__|window\.__NUXT__|ng-version=/i;
const PRICE = /(?:\$|€|£|US\$|USD\s?)\s?\d{1,4}(?:[.,]\d{1,2})?(?!\d)/g;
const PAID_WORDS = /\b(pricing|one[- ]time|lifetime|per listing|featured listing|premium listing|sponsored listing|paid listing|fast[- ]track|expedited|skip the queue|checkout|purchase|buy now|upgrade to)\b/gi;
const FORM_TAG = /<form[\s>]/i;
const URL_FIELD = /<(input|textarea)[^>]*(type=["']?url|(name|id|placeholder|aria-label)=["'][^"']*(url|website|link|site|homepage)[^"']*["'])/i;
const PASSWORD_FIELD = /<input[^>]*type=["']?password/i;
const FREE_WORDS = /\b(free listing|free submission|submit for free|it'?s free|100% free|no cost|free forever|basic \(free\)|free plan)\b/i;

/** @param {string} url @returns {string} */
export function hostOf(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.startsWith('www.') ? host.slice(4) : host;
  } catch {
    return '';
  }
}

/** Collapses whitespace and strips tags so word regexes see page text, not attributes. @param {string} html */
function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * @param {Fetched} f
 * @returns {ProbeResult}
 */
export function classify(f) {
  /** @type {string[]} */
  const signals = [];
  const base = { url: f.url, domain: f.domain, status: f.status, finalUrl: f.finalUrl };

  if (f.error !== null) {
    signals.push(f.error);
    return { ...base, class: 'dead', signals };
  }
  const status = f.status ?? 0;
  const html = f.html;
  const text = visibleText(html);

  if (status === 404 || status === 410 || status === 451) {
    signals.push(`http ${status}`);
    return { ...base, class: 'dead', signals };
  }
  if (PARKED.test(text)) {
    signals.push('parked domain page');
    return { ...base, class: 'dead', signals };
  }
  if (status >= 500) {
    signals.push(`http ${status}`);
    return { ...base, class: 'dead', signals };
  }
  if ((status === 403 || status === 429 || status === 503) || CHALLENGE.test(text.slice(0, 4000))) {
    signals.push(status ? `http ${status}` : 'bot challenge page', 'a real browser may still get through');
    return { ...base, class: 'blocked', signals };
  }

  const finalHost = f.finalUrl ? hostOf(f.finalUrl) : f.domain;
  if (finalHost && finalHost !== f.domain && !finalHost.endsWith(`.${f.domain}`) && !f.domain.endsWith(`.${finalHost}`)) {
    signals.push(`redirected to ${finalHost}`);
  }

  const hasForm = FORM_TAG.test(html);
  const hasUrlField = URL_FIELD.test(html);
  const hasPassword = PASSWORD_FIELD.test(html);
  const loginPath = f.finalUrl !== null && LOGIN_PATH.test(new URL(f.finalUrl).pathname);
  const captcha = CAPTCHA.test(html);

  const prices = text.match(PRICE) ?? [];
  const paidWords = [...new Set((text.match(PAID_WORDS) ?? []).map((w) => w.toLowerCase()))];
  const freeWords = FREE_WORDS.test(text);
  const paidScore = Math.min(prices.length, 5) + paidWords.length * 2;

  if (prices.length > 0) signals.push(`prices: ${[...new Set(prices)].slice(0, 4).join(' ')}`);
  if (paidWords.length > 0) signals.push(`words: ${paidWords.slice(0, 4).join(', ')}`);
  if (freeWords) signals.push('mentions a free option');
  if (captcha) signals.push('captcha script present');

  if (loginPath || (hasPassword && !hasUrlField)) {
    signals.push(loginPath ? 'landed on a login/signup path' : 'password field, no url field');
    return { ...base, class: 'login', signals };
  }
  if (paidScore >= 4 && !freeWords) {
    return { ...base, class: 'paid', signals };
  }
  if (hasForm && hasUrlField) {
    return { ...base, class: captcha ? 'captcha' : 'form', signals };
  }
  const scripts = (html.match(/<script[\s>]/gi) ?? []).length;
  if (JS_APP.test(html) || (text.trim().length < 400 && scripts > 0)) {
    signals.push('JS-rendered page; HTML shows no form');
    return { ...base, class: 'unknown', signals };
  }
  if (hasForm) {
    signals.push('form without a url field (newsletter or contact box?)');
    return { ...base, class: scripts >= 3 ? 'unknown' : 'no-form', signals };
  }
  if (scripts >= 3) {
    signals.push('no form in static HTML, scripts present; open and see');
    return { ...base, class: 'unknown', signals };
  }
  signals.push('no form in HTML');
  return { ...base, class: 'no-form', signals };
}

/** Link text or path that usually leads to a directory's submit page. */
const SUBMIT_HINT = /submit|add[-_ ]?(your[-_ ]?|a[-_ ]?)?(tool|site|product|startup|app|listing|link|project)|list[-_ ]your|get[-_ ]listed|suggest[-_ ]a|post[-_ ]a[-_ ]?(tool|product|startup)|launch[-_ ]your/i;
const ANCHOR = /<a\b[^>]*?\bhref=["']([^"'#]+)["'][^>]*>([\s\S]{0,300}?)<\/a>/gi;

/**
 * Same-site links on a homepage that look like the way to submit, best guess
 * first, at most `max`. Used when the record has a homepage but no submit URL.
 * @param {string} html @param {string} baseUrl @param {number} [max]
 * @returns {string[]}
 */
export function findSubmitLinks(html, baseUrl, max = 3) {
  const host = hostOf(baseUrl);
  /** @type {string[]} */ const found = [];
  if (host === '') return found;
  for (const m of html.matchAll(ANCHOR)) {
    const href = m[1] ?? '';
    const text = (m[2] ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!SUBMIT_HINT.test(href) && !SUBMIT_HINT.test(text)) continue;
    let abs;
    try {
      abs = new URL(href, baseUrl).href;
    } catch {
      continue;
    }
    if (!/^https?:/i.test(abs) || hostOf(abs) !== host || found.includes(abs)) continue;
    found.push(abs);
    if (found.length >= max) break;
  }
  return found;
}

/**
 * Sorts results for the report: easy classes first, then by domain.
 * @param {ProbeResult[]} results
 */
export function sortResults(results) {
  return [...results].sort((a, b) => {
    const d = CLASS_ORDER.indexOf(a.class) - CLASS_ORDER.indexOf(b.class);
    return d !== 0 ? d : a.domain.localeCompare(b.domain);
  });
}
