// Profile checks for preflight.mjs. Pure functions over parsed JSON plus file lookups.
// Severity: "error" blocks the run (core missing, wrong type, text over its limit,
// broken file reference); "warning" lowers coverage but the run can go ahead.
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { readImageInfo } from './image-size.mjs';

export const SCHEMA_ID = 'wheretosubmit-profile/v1';

const TOP_KEYS = ['schema', 'updatedAt', 'source', 'product', 'copy', 'pricing', 'assets', 'contact', 'links', 'accounts', 'permissions', 'extra'];
const PRICING_MODELS = ['free', 'freemium', 'free-trial', 'paid', 'open-source', 'contact'];
const COMMON_COPY = ['short160', 'medium500', 'long1500'];
const VARIANT_KEY = /^(\p{L}[\p{L}_]*?)(\d+)$/u;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LOGO_MIN_PX = 512;
const STALE_DAYS = 120;

/**
 * @typedef {{ field: string, message: string }} Finding
 * @typedef {{ errors: Finding[], warnings: Finding[], stats: { textVariants: number, files: number } }} Report
 */

/** @param {unknown} v @returns {v is Record<string, unknown>} */
const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/** A template value that was never replaced. @param {unknown} v */
const isPlaceholder = (v) => typeof v === 'string' && /^\s*TODO\b/i.test(v);

/** Missing, empty, or still a TODO. @param {unknown} v */
const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && (v.trim() === '' || isPlaceholder(v)));

/** Character count by code point, so emoji and CJK count as one. @param {string} s */
const charCount = (s) => [...s].length;

/** @param {Record<string, unknown>} obj */
const ownKeys = (obj) => Object.keys(obj).filter((k) => !k.startsWith('_'));

class Collector {
  constructor() {
    /** @type {Finding[]} */ this.errors = [];
    /** @type {Finding[]} */ this.warnings = [];
    this.stats = { textVariants: 0, files: 0 };
  }
  /** @param {string} field @param {string} message */
  error(field, message) {
    this.errors.push({ field, message });
  }
  /** @param {string} field @param {string} message */
  warn(field, message) {
    this.warnings.push({ field, message });
  }
}

/**
 * Reads a section that must be an object. Reports and returns {} otherwise.
 * @param {Collector} c @param {Record<string, unknown>} profile @param {string} key @param {boolean} required
 * @returns {Record<string, unknown>}
 */
function section(c, profile, key, required) {
  const value = profile[key];
  if (isObject(value)) return value;
  if (value === undefined || value === null) {
    if (required) c.error(key, 'section is missing');
    else c.warn(key, 'section is missing');
  } else {
    c.error(key, `must be an object, got ${Array.isArray(value) ? 'array' : typeof value}`);
  }
  return {};
}

/**
 * @param {Collector} c @param {string} field @param {unknown} value
 * @param {'core' | 'common' | 'optional'} tier
 * @returns {string | null} the usable string, or null
 */
function expectString(c, field, value, tier) {
  if (value !== undefined && value !== null && typeof value !== 'string') {
    c.error(field, `must be a string, got ${typeof value}`);
    return null;
  }
  if (isBlank(value)) {
    if (tier === 'core') c.error(field, isPlaceholder(value) ? 'still a TODO placeholder' : 'required, missing');
    else if (tier === 'common') c.warn(field, isPlaceholder(value) ? 'still a TODO placeholder' : 'missing; many sites ask for it');
    return null;
  }
  return /** @type {string} */ (value);
}

/** @param {Collector} c @param {string} field @param {unknown} value @param {'common' | 'optional'} tier */
function expectStringArray(c, field, value, tier) {
  if (value === undefined || value === null) {
    if (tier === 'common') c.warn(field, 'missing; many sites ask for it');
    return [];
  }
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
    c.error(field, 'must be an array of strings');
    return [];
  }
  const real = value.filter((v) => !isBlank(v));
  if (real.length === 0 && tier === 'common') c.warn(field, value.length > 0 ? 'only TODO or empty entries; many sites ask for it' : 'empty; many sites ask for it');
  else if (real.length < value.length) c.warn(field, 'contains TODO or empty entries');
  return real;
}

/** @param {Collector} c @param {string} field @param {string} value */
function checkHttpUrl(c, field, value, severity = 'error') {
  let url;
  try {
    url = new URL(value);
  } catch {
    url = null;
  }
  if (!url || !/^https?:$/.test(url.protocol) || !url.hostname.includes('.')) {
    if (severity === 'error') c.error(field, `not a valid http(s) URL: ${value}`);
    else c.warn(field, `not a valid http(s) URL: ${value}`);
    return null;
  }
  return url;
}

/** @param {Collector} c @param {Record<string, unknown>} p */
function checkTop(c, p) {
  if (p.schema !== SCHEMA_ID) {
    c.error('schema', `expected "${SCHEMA_ID}", got ${JSON.stringify(p.schema ?? null)}. Start from templates/profile.json and move your data into it.`);
  }
  for (const key of ownKeys(p)) {
    if (!TOP_KEYS.includes(key)) c.warn(key, 'unknown top-level key, ignored by the skill');
  }
  const updated = expectString(c, 'updatedAt', p.updatedAt, 'common');
  if (updated) {
    const time = Date.parse(updated);
    if (Number.isNaN(time)) c.warn('updatedAt', 'not a date (use YYYY-MM-DD)');
    else if ((Date.now() - time) / 86_400_000 > STALE_DAYS) c.warn('updatedAt', `older than ${STALE_DAYS} days; re-check prices and copy`);
  }
  expectString(c, 'source', p.source, 'common');
}

/** @param {Collector} c @param {Record<string, unknown>} p */
function checkProduct(c, p) {
  const product = section(c, p, 'product', true);
  const name = expectString(c, 'product.name', product.name, 'core');
  if (name && charCount(name) > 80) c.warn('product.name', 'longer than 80 characters; most sites cut it');
  const url = expectString(c, 'product.url', product.url, 'core');
  if (url) {
    const parsed = checkHttpUrl(c, 'product.url', url);
    if (parsed && (parsed.pathname.length > 1 || parsed.search)) {
      c.warn('product.url', 'is a deep link; directories usually want the root URL');
    }
  }
  const pricingUrl = expectString(c, 'product.pricingUrl', product.pricingUrl, 'optional');
  if (pricingUrl) checkHttpUrl(c, 'product.pricingUrl', pricingUrl, 'warning');
  expectStringArray(c, 'product.categories', product.categories, 'common');
  expectStringArray(c, 'product.tags', product.tags, 'common');
  expectStringArray(c, 'product.audience', product.audience, 'optional');
  expectStringArray(c, 'product.alternateNames', product.alternateNames, 'optional');
  expectStringArray(c, 'product.platforms', product.platforms, 'optional');
  expectStringArray(c, 'product.languages', product.languages, 'optional');
}

/** @param {Collector} c @param {Record<string, unknown>} p */
function checkCopy(c, p) {
  const copy = section(c, p, 'copy', true);
  if (!isObject(copy.en)) {
    c.error('copy.en', 'required: English copy with at least one tagline variant');
  }
  for (const lang of ownKeys(copy)) {
    const texts = copy[lang];
    if (!isObject(texts)) {
      c.error(`copy.${lang}`, 'must be an object of text variants');
      continue;
    }
    for (const key of ownKeys(texts)) {
      const field = `copy.${lang}.${key}`;
      const text = expectString(c, field, texts[key], 'optional');
      if (text === null) {
        if (isPlaceholder(texts[key])) c.warn(field, 'still a TODO placeholder');
        continue;
      }
      c.stats.textVariants += 1;
      const match = VARIANT_KEY.exec(key);
      if (!match) {
        c.warn(field, 'no length in the key (e.g. short160); the agent cannot tell which limit it fits');
        continue;
      }
      const max = Number(match[2]);
      const len = charCount(text);
      if (len > max) c.error(field, `${len} characters, over its declared limit of ${max}`);
      if (match[1].startsWith('impartial') && /\b(we|our|us)\b/i.test(text)) {
        c.warn(field, 'impartial text uses we/our/us; sites asking for neutral copy reject that');
      }
    }
  }
  const en = isObject(copy.en) ? copy.en : {};
  const taglines = ownKeys(en).filter((k) => /^tagline\d+$/.test(k) && !isBlank(en[k]));
  if (isObject(copy.en) && taglines.length === 0) c.error('copy.en.tagline<N>', 'required: at least one tagline, e.g. tagline60');
  else if (taglines.length > 0 && !taglines.includes('tagline60')) c.warn('copy.en.tagline60', 'missing; Product Hunt and many directories cap taglines at 60');
  for (const key of COMMON_COPY) {
    if (isObject(copy.en) && isBlank(en[key]) && !isPlaceholder(en[key])) c.warn(`copy.en.${key}`, 'missing; many sites ask for this length');
  }
}

/** @param {Collector} c @param {Record<string, unknown>} p */
function checkPricing(c, p) {
  const pricing = section(c, p, 'pricing', false);
  const model = expectString(c, 'pricing.model', pricing.model, 'common');
  if (model && !PRICING_MODELS.includes(model.toLowerCase())) c.warn('pricing.model', `unknown value "${model}"; use one of ${PRICING_MODELS.join(', ')}`);
  for (const key of ['hasFreeTrial', 'requiresCard']) {
    if (pricing[key] !== undefined && pricing[key] !== null && typeof pricing[key] !== 'boolean') c.error(`pricing.${key}`, 'must be true or false');
  }
  expectString(c, 'pricing.startingPrice', pricing.startingPrice, 'optional');
}

/**
 * Resolves an asset path against the workspace and checks it exists.
 * @param {Collector} c @param {string} dir @param {string} field @param {string} rel
 * @returns {string | null} absolute path when the file exists
 */
function resolveAsset(c, dir, field, rel) {
  if (/^https?:\/\//i.test(rel)) {
    c.error(field, 'must be a local file path; sites need an upload, not a URL');
    return null;
  }
  const abs = path.resolve(dir, rel);
  if (!existsSync(abs) || !statSync(abs).isFile()) {
    c.error(field, `file not found: ${rel}`);
    return null;
  }
  c.stats.files += 1;
  return abs;
}

/** @param {Collector} c @param {string} field @param {string} abs */
function safeImageInfo(c, field, abs) {
  try {
    return readImageInfo(abs);
  } catch (err) {
    c.error(field, `cannot read file: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/** @param {Collector} c @param {Record<string, unknown>} p @param {string} dir */
function checkAssets(c, p, dir) {
  const assets = section(c, p, 'assets', true);
  const logo = expectString(c, 'assets.logoSquare', assets.logoSquare, 'core');
  if (logo) {
    const abs = resolveAsset(c, dir, 'assets.logoSquare', logo);
    const info = abs ? safeImageInfo(c, 'assets.logoSquare', abs) : null;
    if (info && info.format === 'unknown') c.error('assets.logoSquare', 'not a PNG, JPEG, GIF, WebP or SVG file');
    if (info && 'width' in info) {
      if (info.width !== info.height) c.error('assets.logoSquare', `not square: ${info.width}x${info.height}`);
      if (Math.min(info.width, info.height) < LOGO_MIN_PX) c.error('assets.logoSquare', `${info.width}x${info.height} is below ${LOGO_MIN_PX}px`);
    }
  }
  for (const key of ['logoWide', 'ogImage']) {
    const rel = expectString(c, `assets.${key}`, assets[key], 'optional');
    if (rel) {
      const abs = resolveAsset(c, dir, `assets.${key}`, rel);
      const info = abs ? safeImageInfo(c, `assets.${key}`, abs) : null;
      if (info && info.format === 'unknown') c.warn(`assets.${key}`, 'unrecognised image format');
    }
  }
  const shots = expectStringArray(c, 'assets.screenshots', assets.screenshots, 'common');
  shots.forEach((rel, i) => {
    const field = `assets.screenshots[${i}]`;
    const abs = resolveAsset(c, dir, field, rel);
    const info = abs ? safeImageInfo(c, field, abs) : null;
    if (info && info.format === 'unknown') c.warn(field, 'unrecognised image format');
  });
  const video = expectString(c, 'assets.demoVideoUrl', assets.demoVideoUrl, 'optional');
  if (video) checkHttpUrl(c, 'assets.demoVideoUrl', video, 'warning');
}

/** @param {Collector} c @param {Record<string, unknown>} p */
function checkContact(c, p) {
  const contact = section(c, p, 'contact', true);
  const email = expectString(c, 'contact.email', contact.email, 'core');
  if (email && !EMAIL.test(email)) c.error('contact.email', `does not look like an email address: ${email}`);
  const submitter = expectString(c, 'contact.submitterName', contact.submitterName, 'optional');
  const founder = expectString(c, 'contact.founderName', contact.founderName, 'optional');
  if (!submitter && !founder) c.warn('contact.founderName', 'no submitterName or founderName; most forms ask for a name');
  expectString(c, 'contact.role', contact.role, 'optional');
}

/** @param {Collector} c @param {Record<string, unknown>} p */
function checkLinks(c, p) {
  if (p.links === undefined || p.links === null) {
    c.warn('links', 'section is missing; fine, but some sites ask for at least one social link');
    return;
  }
  const links = section(c, p, 'links', false);
  let count = 0;
  for (const key of ownKeys(links)) {
    const value = expectString(c, `links.${key}`, links[key], 'optional');
    if (value && checkHttpUrl(c, `links.${key}`, value, 'warning')) count += 1;
  }
  if (count === 0) c.warn('links', 'no social links; fine, but some sites ask for at least one');
}

/** @param {Collector} c @param {Record<string, unknown>} p */
function checkPermissions(c, p) {
  const defaults = { allowRegistration: false, allowCaptchaHandoff: true, allowPaid: false };
  if (p.permissions === undefined || p.permissions === null) {
    c.warn('permissions', `section is missing; the agent uses the defaults ${JSON.stringify(defaults)}`);
    return;
  }
  const perms = section(c, p, 'permissions', false);
  for (const [key, fallback] of Object.entries(defaults)) {
    const value = perms[key];
    if (value === undefined) c.warn(`permissions.${key}`, `missing; the agent uses the default (${fallback})`);
    else if (typeof value !== 'boolean') c.error(`permissions.${key}`, 'must be true or false');
  }
  if (perms.neverShare !== undefined) expectStringArray(c, 'permissions.neverShare', perms.neverShare, 'optional');
}

/**
 * accounts: optional. With allowRegistration on and no usable default account,
 * every account-gated site gets skipped, so say so up front.
 * @param {Collector} c @param {Record<string, unknown>} p
 */
function checkAccounts(c, p) {
  const perms = isObject(p.permissions) ? p.permissions : {};
  if (p.accounts === undefined || p.accounts === null) {
    if (perms.allowRegistration === true) c.warn('accounts', 'allowRegistration is on but no accounts section; account-gated sites will be skipped');
    return;
  }
  const accounts = section(c, p, 'accounts', false);
  const def = accounts.default;
  if (def !== undefined && def !== null) {
    if (!isObject(def)) c.error('accounts.default', 'must be an object with email / password / username');
    else {
      if (def.email !== null && def.email !== undefined) {
        if (typeof def.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(def.email)) c.error('accounts.default.email', 'not an email address');
      }
      if (def.password !== null && def.password !== undefined && typeof def.password !== 'string') c.error('accounts.default.password', 'must be a string or null');
      if (typeof def.password === 'string' && def.password.length > 0) c.warn('accounts', 'contains a password; make sure .wheretosubmit/ is in .gitignore');
      if (perms.allowRegistration === true && isBlank(def.email)) c.warn('accounts.default.email', 'allowRegistration is on but no account email; the agent will ask before every sign-up');
    }
  }
  if (accounts.sites !== undefined && !isObject(accounts.sites)) c.error('accounts.sites', 'must be an object keyed by domain');
}

/** @param {Collector} c @param {Record<string, unknown>} p */
function checkExtra(c, p) {
  if (p.extra === undefined) return;
  const extra = section(c, p, 'extra', false);
  for (const key of ownKeys(extra)) {
    const value = extra[key];
    if (!['string', 'number', 'boolean'].includes(typeof value)) c.error(`extra.${key}`, 'must be a string, number or boolean');
  }
}

/**
 * Runs every check. Never throws on bad data; I/O errors become findings.
 * @param {unknown} profile parsed profile.json
 * @param {string} dir workspace directory (absolute)
 * @returns {Report}
 */
/**
 * Compact facts for the readiness checklist: what is there, how long, how big.
 * No text bodies and nothing from `accounts` except whether a value is set.
 * @param {unknown} profile @param {string} dir
 */
export function summarizeProfile(profile, dir) {
  if (!isObject(profile)) return null;
  const obj = (v) => (isObject(v) ? v : {});
  const str = (v) => (typeof v === 'string' && !isBlank(v) ? v : null);
  const product = obj(profile.product);
  const copy = obj(profile.copy);
  const pricing = obj(profile.pricing);
  const assets = obj(profile.assets);
  const contact = obj(profile.contact);
  const accounts = obj(profile.accounts);
  const def = obj(accounts.default);
  const mailbox = obj(accounts.mailbox);
  const perms = obj(profile.permissions);

  /** @type {Record<string, Record<string, number>>} copy lengths per language, e.g. { en: { tagline: 72, short160: 118 } } */
  const copyLengths = {};
  for (const lang of ownKeys(copy)) {
    const variants = obj(copy[lang]);
    const lengths = {};
    for (const key of ownKeys(variants)) {
      const value = variants[key];
      if (typeof value === 'string' && !isBlank(value)) lengths[key] = charCount(value);
    }
    copyLengths[lang] = lengths;
  }

  const imageInfo = (rel) => {
    if (typeof rel !== 'string' || isBlank(rel) || /^https?:\/\//i.test(rel)) return null;
    const abs = path.resolve(dir, rel);
    if (!existsSync(abs) || !statSync(abs).isFile()) return { file: rel, exists: false };
    try {
      const info = readImageInfo(abs);
      return 'width' in info ? { file: rel, exists: true, width: info.width, height: info.height } : { file: rel, exists: true };
    } catch {
      return { file: rel, exists: true };
    }
  };
  const shots = Array.isArray(assets.screenshots) ? assets.screenshots.map(imageInfo).filter(Boolean) : [];

  return {
    updatedAt: str(profile.updatedAt),
    product: {
      name: str(product.name),
      url: str(product.url),
      categories: Array.isArray(product.categories) ? product.categories.filter((v) => typeof v === 'string' && !isBlank(v)) : [],
    },
    copy: copyLengths,
    pricing: { model: str(pricing.model), startingPrice: str(pricing.startingPrice) },
    assets: {
      logoSquare: imageInfo(assets.logoSquare),
      logoWide: imageInfo(assets.logoWide),
      ogImage: imageInfo(assets.ogImage),
      screenshots: shots,
    },
    contact: {
      email: str(contact.email),
      submitterName: str(contact.submitterName),
      founderName: str(contact.founderName),
    },
    accounts: {
      email: str(def.email),
      hasPassword: typeof def.password === 'string' && def.password.length > 0,
      mailboxUrl: str(mailbox.url),
      mailboxHasPassword: typeof mailbox.password === 'string' && mailbox.password.length > 0,
      siteOverrides: ownKeys(obj(accounts.sites)).length,
    },
    permissions: {
      allowRegistration: perms.allowRegistration === true,
      allowCaptchaHandoff: perms.allowCaptchaHandoff !== false,
      allowPaid: perms.allowPaid === true,
    },
  };
}

export function checkProfile(profile, dir) {
  const c = new Collector();
  if (!isObject(profile)) {
    c.error('(root)', 'profile.json must contain a JSON object');
    return c;
  }
  checkTop(c, profile);
  checkProduct(c, profile);
  checkCopy(c, profile);
  checkPricing(c, profile);
  checkAssets(c, profile, dir);
  checkContact(c, profile);
  checkLinks(c, profile);
  checkPermissions(c, profile);
  checkAccounts(c, profile);
  checkExtra(c, profile);
  return c;
}
