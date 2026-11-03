#!/usr/bin/env node
/**
 * Checks <workspace>/comment.json before a comment run.
 *   node scripts/preflight.mjs --dir ./.wheretosubmit [--json]
 * Exit 0: ready (warnings allowed). Exit 1: blocking problems.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const SCHEMA_ID = 'wheretosubmit-comment/v1';
const MAX_COUNT = 25;
const PACES = new Set(['normal', 'careful']);
const PLACEMENTS = new Set(['when-no-website-field', 'never', 'always']);
/** Providers that hand out throwaway mailboxes; a comment from one is flagged on sight. */
const DISPOSABLE = /@(mailinator|guerrillamail|10minutemail|temp-mail|tempmail|yopmail|sharklasers|trashmail|getnada|dispostable|maildrop)\./i;

const errors = [];
const warnings = [];
const err = (field, message) => errors.push({ field, message });
const warn = (field, message) => warnings.push({ field, message });

const isTodo = (v) => typeof v === 'string' && v.trim().toUpperCase().startsWith('TODO');
const missing = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || isTodo(v);
const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

function httpUrl(field, value, required) {
  if (missing(value)) {
    if (required) err(field, 'missing');
    return;
  }
  if (typeof value !== 'string') return err(field, 'must be a string');
  try {
    const u = new URL(value);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') err(field, 'must start with http:// or https://');
  } catch {
    err(field, 'not a valid URL');
  }
}

function parseArgs(argv) {
  const out = { dir: './.wheretosubmit', json: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--dir' && argv[i + 1]) out.dir = argv[++i];
    else if (argv[i] === '--json') out.json = true;
  }
  return out;
}

function load(dir) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return { problem: `workspace not found: ${dir}` };
  const file = path.join(dir, 'comment.json');
  if (!existsSync(file)) return { problem: `comment.json not found in ${dir}. Copy templates/comment.json there and fill it in.` };
  try {
    return { data: JSON.parse(readFileSync(file, 'utf8')) };
  } catch (e) {
    return { problem: `comment.json is not valid JSON: ${e instanceof Error ? e.message : String(e)}` };
  }
}

function check(c) {
  if (c.schema !== SCHEMA_ID) err('schema', `expected ${SCHEMA_ID}`);
  if (missing(c.updatedAt)) warn('updatedAt', 'missing');

  const id = isObject(c.identity) ? c.identity : (err('identity', 'missing'), {});
  if (missing(id.name)) err('identity.name', 'missing');
  else if (String(id.name).trim().length > 60) err('identity.name', 'longer than 60 characters');
  if (missing(id.email)) err('identity.email', 'missing');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(id.email))) err('identity.email', 'not an email address');
  else if (DISPOSABLE.test(String(id.email))) err('identity.email', 'disposable mailbox; use one you own on a normal provider');
  httpUrl('identity.website', id.website, true);

  const pages = isObject(c.pages) && Array.isArray(c.pages.items) ? c.pages.items : null;
  if (!pages || pages.length === 0) err('pages.items', 'at least one linkable page is required');
  else {
    pages.forEach((p, i) => {
      const f = `pages.items[${i}]`;
      if (!isObject(p)) return err(f, 'must be an object');
      httpUrl(`${f}.url`, p.url, true);
      if (missing(p.about)) err(`${f}.about`, 'missing');
      if (!Array.isArray(p.topics) || p.topics.length === 0 || p.topics.some(missing)) err(`${f}.topics`, 'needs at least one topic');
    });
  }

  const examples = isObject(c.styleExamples) && Array.isArray(c.styleExamples.items) ? c.styleExamples.items.filter((s) => !missing(s)) : [];
  if (examples.length < 3) warn('styleExamples.items', `${examples.length} usable examples; three to five recommended`);
  for (const [i, s] of examples.entries()) {
    const n = [...String(s)].length;
    if (n < 250 || n > 400) warn(`styleExamples.items[${i}]`, `${n} characters; examples should be 250 to 400`);
  }

  if (!PLACEMENTS.has(c.linkInBody)) err('linkInBody', 'must be when-no-website-field, never or always');
  if (typeof c.hrefBreak !== 'boolean') err('hrefBreak', 'must be true or false');
  if (!Array.isArray(c.usedAnchors)) err('usedAnchors', 'must be an array');

  const run = isObject(c.run) ? c.run : {};
  if (!Number.isInteger(run.count) || run.count < 1 || run.count > MAX_COUNT) err('run.count', `must be an integer from 1 to ${MAX_COUNT}`);
  if (!PACES.has(run.pace)) err('run.pace', 'must be normal or careful');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const dir = path.resolve(args.dir);
  const loaded = load(dir);
  if (loaded.problem) {
    if (args.json) process.stdout.write(`${JSON.stringify({ ready: false, errors: [{ field: 'file', message: loaded.problem }], warnings: [] })}\n`);
    else process.stdout.write(`${loaded.problem}\n`);
    process.exit(1);
  }
  check(loaded.data);
  const ready = errors.length === 0;
  if (args.json) {
    process.stdout.write(`${JSON.stringify({ ready, errors, warnings })}\n`);
  } else {
    const lines = [`wheretosubmit comment preflight`, `workspace: ${dir}`, ''];
    if (errors.length) lines.push('BLOCKING:', ...errors.map((e) => `  ${e.field}: ${e.message}`), '');
    if (warnings.length) lines.push('WARNINGS:', ...warnings.map((w) => `  ${w.field}: ${w.message}`), '');
    lines.push(ready ? 'READY' : 'NOT READY');
    process.stdout.write(`${lines.join('\n')}\n`);
  }
  process.exit(ready ? 0 : 1);
}

main();
