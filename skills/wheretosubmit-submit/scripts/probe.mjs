#!/usr/bin/env node
// Probe for the wheretosubmit-submit skill: fetches many submit pages at once
// (plain HTTP, no browser) and sorts them into form / login / paid / dead and
// so on, so the agent opens the promising ones first. Node 20+, no dependencies.
//
// Usage:
//   node probe.mjs --input targets.json [--json] [--concurrency 8] [--timeout 12000]
//   node probe.mjs https://a.com/submit https://b.io/add
//
// targets.json is the next_targets result ({ targets: [...] }), a bare array of
// such items, or an array of URLs. Items without submitUrl but with homepageUrl
// (no submit page on file) are probed on the homepage, and same-site links that
// look like a submit page are listed. Gated items with neither are skipped.
// Exit codes: 0 done, 2 bad arguments. A site that fails is a result, not an error.
import { readFileSync } from 'node:fs';
import { classify, findSubmitLinks, hostOf, sortResults } from './lib/probe-classify.mjs';

const USAGE = `Usage: node probe.mjs (--input <targets.json> | <url> ...) [--json] [--concurrency N] [--timeout MS]

  --input <file>     next_targets output, an array of targets, or an array of URLs
  --json             machine-readable result
  --concurrency N    parallel requests (default 8, max 16)
  --timeout MS       per request (default 12000)
`;

/** Bytes of HTML read per page; forms and price tables sit well within this. */
const MAX_BODY = 400 * 1024;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

/** @param {string} text */
const out = (text) => process.stdout.write(text);

/**
 * @param {string[]} argv
 * @returns {{ input: string | null, urls: string[], json: boolean, concurrency: number, timeout: number } | { help: true } | { error: string }}
 */
function parseArgs(argv) {
  /** @type {string | null} */ let input = null;
  /** @type {string[]} */ const urls = [];
  let json = false;
  let concurrency = 8;
  let timeout = 12_000;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) return null;
      i += 1;
      return v;
    };
    if (arg === '--help' || arg === '-h') return { help: true };
    else if (arg === '--json') json = true;
    else if (arg === '--input') {
      input = next();
      if (input === null) return { error: '--input needs a file' };
    } else if (arg === '--concurrency') {
      const v = Number(next());
      if (!Number.isInteger(v) || v < 1) return { error: '--concurrency needs a positive integer' };
      concurrency = Math.min(v, 16);
    } else if (arg === '--timeout') {
      const v = Number(next());
      if (!Number.isInteger(v) || v < 1000) return { error: '--timeout needs milliseconds (>= 1000)' };
      timeout = v;
    } else if (arg.startsWith('--')) return { error: `unknown argument: ${arg}` };
    else urls.push(arg);
  }
  if (input === null && urls.length === 0) return { error: 'give --input or at least one URL' };
  return { input, urls, json, concurrency, timeout };
}

/**
 * Turns whatever the agent saved into a list of probe targets.
 * @param {unknown} data
 * @returns {Target[]}
 */
function toTargets(data) {
  const list = Array.isArray(data)
    ? data
    : data !== null && typeof data === 'object' && Array.isArray(/** @type {{ targets?: unknown }} */ (data).targets)
      ? /** @type {{ targets: unknown[] }} */ (data).targets
      : null;
  if (list === null) throw new Error('input must be a next_targets result or an array');
  /** @type {Target[]} */
  const targets = [];
  for (const item of list) {
    if (typeof item === 'string') {
      if (/^https?:\/\//i.test(item)) targets.push({ url: item, domain: hostOf(item), name: '', homepage: false });
      continue;
    }
    if (item === null || typeof item !== 'object') continue;
    const rec = /** @type {Record<string, unknown>} */ (item);
    const submit = typeof rec.submitUrl === 'string' ? rec.submitUrl : typeof rec.url === 'string' ? rec.url : null;
    // Gated items hide submitUrl behind the plan; only fall back to the homepage when nothing is on file
    const home = rec.gated !== true && typeof rec.homepageUrl === 'string' ? rec.homepageUrl : null;
    const url = submit ?? home;
    if (url === null || !/^https?:\/\//i.test(url)) continue;
    const domain = typeof rec.domain === 'string' && rec.domain !== '' ? rec.domain.replace(/^www\./, '') : hostOf(url);
    targets.push({ url, domain, name: typeof rec.name === 'string' ? rec.name : '', homepage: submit === null });
  }
  return targets;
}

/** @typedef {{ url: string, domain: string, name: string, homepage: boolean }} Target */

/**
 * Fetches one page, following redirects, reading at most MAX_BODY of text.
 * Never throws: network problems become `error`.
 * @param {string} url @param {number} timeout
 * @returns {Promise<{ status: number | null, finalUrl: string | null, error: string | null, html: string }>}
 */
async function fetchPage(url, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8', 'accept-language': 'en-US,en;q=0.9' },
    });
    const type = res.headers.get('content-type') ?? '';
    if (!/html|xml|text\/plain|^$/i.test(type)) {
      return { status: res.status, finalUrl: res.url || url, error: null, html: '' };
    }
    let html = '';
    if (res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8', { fatal: false });
      let size = 0;
      while (size < MAX_BODY) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        size += value.byteLength;
        html += decoder.decode(value, { stream: true });
      }
      await reader.cancel().catch(() => undefined);
    }
    return { status: res.status, finalUrl: res.url || url, error: null, html };
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    const cause = err instanceof Error && err.cause instanceof Error ? ` (${err.cause.message})` : '';
    const message = name === 'AbortError' ? `timeout after ${timeout} ms` : `${err instanceof Error ? err.message : String(err)}${cause}`;
    return { status: null, finalUrl: null, error: message, html: '' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Runs `worker` over `items` with at most `limit` in flight.
 * @template T, R
 * @param {T[]} items @param {number} limit @param {(item: T) => Promise<R>} worker
 * @returns {Promise<R[]>}
 */
async function mapLimit(items, limit, worker) {
  /** @type {R[]} */ const results = new Array(items.length);
  let next = 0;
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next;
      next += 1;
      results[i] = await worker(items[i]);
    }
  });
  await Promise.all(lanes);
  return results;
}

/** @param {import('./lib/probe-classify.mjs').ProbeResult[]} results @param {Map<string, string>} names */
function printText(results, names) {
  const width = Math.max(6, ...results.map((r) => r.domain.length));
  out(`wheretosubmit probe: ${results.length} pages\n\n`);
  out(`${'domain'.padEnd(width)}  class    http  signals\n`);
  for (const r of results) {
    const name = names.get(r.url);
    const http = r.status === null ? '-' : String(r.status);
    const signals = r.signals.join('; ') + (name ? `  [${name}]` : '');
    out(`${r.domain.padEnd(width)}  ${r.class.padEnd(8)} ${http.padEnd(5)} ${signals}\n`);
  }
  /** @type {Record<string, number>} */ const counts = {};
  for (const r of results) counts[r.class] = (counts[r.class] ?? 0) + 1;
  out(`\n${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}\n`);
  out('form = open it first; unknown = JS page, open and see; login/paid/captcha = handle per gates.md; dead = mark unusable after one look.\n');
  out('homepage only = no submit page on file: the class is about the homepage; start from the listed submit link, else look for one by hand.\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if ('help' in args) {
    out(USAGE);
    return 0;
  }
  if ('error' in args) {
    process.stderr.write(`${args.error}\n\n${USAGE}`);
    return 2;
  }

  /** @type {Target[]} */
  let targets = args.urls.map((url) => ({ url, domain: hostOf(url), name: '', homepage: false }));
  if (args.input !== null) {
    try {
      targets = targets.concat(toTargets(JSON.parse(readFileSync(args.input, 'utf8'))));
    } catch (err) {
      process.stderr.write(`cannot read ${args.input}: ${err instanceof Error ? err.message : String(err)}\n`);
      return 2;
    }
  }
  // One probe per URL; the same site listed twice is checked once.
  const seen = new Set();
  targets = targets.filter((t) => t.domain !== '' && !seen.has(t.url) && seen.add(t.url));
  if (targets.length === 0) {
    process.stderr.write('no probeable targets (gated items have no submitUrl or homepageUrl)\n');
    return 2;
  }

  const results = await mapLimit(targets, args.concurrency, async (t) => {
    const page = await fetchPage(t.url, args.timeout);
    const result = classify({ url: t.url, domain: t.domain, ...page });
    if (!t.homepage) return result;
    // Homepage only: the class says whether the site is alive; the links are where to look for the form
    const submitLinks = result.class === 'dead' ? [] : findSubmitLinks(page.html, page.finalUrl ?? t.url);
    const hint =
      submitLinks.length > 0
        ? `homepage only; submit link: ${submitLinks.join(' , ')}`
        : result.class === 'dead'
          ? 'homepage only'
          : 'homepage only; no submit link in static HTML';
    return { ...result, homepage: true, submitLinks, signals: [hint, ...result.signals] };
  });
  const sorted = sortResults(results);

  if (args.json) {
    out(`${JSON.stringify({ probedAt: new Date().toISOString(), results: sorted }, null, 2)}\n`);
  } else {
    printText(sorted, new Map(targets.map((t) => [t.url, t.name])));
  }
  return 0;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (err) => {
    // Last-resort guard: report instead of a stack trace.
    process.stderr.write(`probe failed unexpectedly: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  },
);
