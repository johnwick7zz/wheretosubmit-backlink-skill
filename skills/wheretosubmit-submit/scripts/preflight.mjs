#!/usr/bin/env node
// Preflight for the wheretosubmit-submit skill. Node 20+, no dependencies.
// Usage: node preflight.mjs [--dir <workspace>] [--json]
// Exit codes: 0 ready, 1 blocking problems, 2 bad arguments.
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { SCHEMA_ID, checkProfile } from './lib/checks.mjs';

const USAGE = `Usage: node preflight.mjs [--dir <workspace>] [--json]

  --dir <path>  workspace folder holding profile.json (default ./.wheretosubmit)
  --json        print a machine-readable result instead of the text report
`;

/** @param {string} text */
const out = (text) => process.stdout.write(text);

/** @param {string[]} argv @returns {{ dir: string, json: boolean } | { help: true } | { error: string }} */
function parseArgs(argv) {
  let dir = './.wheretosubmit';
  let json = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') json = true;
    else if (arg === '--help' || arg === '-h') return { help: true };
    else if (arg === '--dir') {
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) return { error: '--dir needs a path' };
      dir = next;
      i += 1;
    } else if (arg.startsWith('--dir=')) dir = arg.slice('--dir='.length);
    else return { error: `unknown argument: ${arg}` };
  }
  return { dir: path.resolve(dir), json };
}

/**
 * Loads profile.json. Returns a parse problem instead of throwing.
 * @param {string} dir
 * @returns {{ profile: unknown } | { problem: string }}
 */
function loadProfile(dir) {
  const file = path.join(dir, 'profile.json');
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    return { problem: `workspace folder not found: ${dir}. Create it and copy templates/profile.json into it.` };
  }
  if (!existsSync(file)) return { problem: `profile.json not found in ${dir}. Copy templates/profile.json there and fill it in.` };
  try {
    return { profile: JSON.parse(readFileSync(file, 'utf8')) };
  } catch (err) {
    return { problem: `profile.json is not valid JSON: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/** @param {string} dir @returns {string[]} workspace layout notes */
function layoutNotes(dir) {
  return ['assets', 'evidence', 'reports']
    .filter((sub) => !existsSync(path.join(dir, sub)))
    .map((sub) => `${sub}/ folder is missing; create it before the run`);
}

/**
 * @param {string} dir
 * @param {{ field: string, message: string }[]} errors
 * @param {{ field: string, message: string }[]} warnings
 * @param {{ textVariants: number, files: number }} stats
 */
function printText(dir, errors, warnings, stats) {
  out(`wheretosubmit preflight\nworkspace: ${dir}\nexpected schema: ${SCHEMA_ID}\n\n`);
  if (errors.length > 0) {
    out(`Blocking (${errors.length})\n`);
    for (const e of errors) out(`  x ${e.field}: ${e.message}\n`);
    out('\n');
  }
  if (warnings.length > 0) {
    out(`Warnings (${warnings.length})\n`);
    for (const w of warnings) out(`  ! ${w.field}: ${w.message}\n`);
    out('\n');
  }
  out(`Checked ${stats.textVariants} text variants and ${stats.files} files.\n`);
  out(errors.length === 0
    ? 'Result: READY. Warnings mean some sites may ask for things the profile lacks.\n'
    : 'Result: NOT READY. Fix the blocking items, then run preflight again.\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if ('help' in args) {
    out(USAGE);
    return 0;
  }
  if ('error' in args) {
    process.stderr.write(`${args.error}\n\n${USAGE}`);
    return 2;
  }

  const loaded = loadProfile(args.dir);
  const report = 'problem' in loaded
    ? { errors: [{ field: 'profile.json', message: loaded.problem }], warnings: [], stats: { textVariants: 0, files: 0 } }
    : checkProfile(loaded.profile, args.dir);
  const warnings = [
    ...report.warnings,
    ...('problem' in loaded ? [] : layoutNotes(args.dir).map((message) => ({ field: 'workspace', message }))),
  ];
  const ok = report.errors.length === 0;

  if (args.json) {
    out(`${JSON.stringify({ ok, dir: args.dir, schema: SCHEMA_ID, errors: report.errors, warnings, stats: report.stats }, null, 2)}\n`);
  } else {
    printText(args.dir, report.errors, warnings, report.stats);
  }
  return ok ? 0 : 1;
}

try {
  process.exitCode = main();
} catch (err) {
  // Last-resort guard: report instead of a stack trace.
  process.stderr.write(`preflight failed unexpectedly: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
}
