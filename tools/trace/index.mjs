#!/usr/bin/env node
/**
 * Requirement traceability tool (VER-3).
 *
 * Extracts candidate requirement IDs from the numbered headings of docs 01–05
 * and 07, removes the IDs listed in tools/trace/exempt.yaml (each with a
 * reason), scans test titles for `[ID]` tags, writes docs/traceability.md, and
 * reports untraced IDs. Untraced IDs are a warning (exit 0) until milestone
 * M10; `--strict` makes them an error.
 *
 * Repository tooling: not part of a pure package.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export const DOCUMENTS = [
  { file: 'docs/01_Core_Game_Framework_GDD.md', prefix: 'GDD' },
  { file: 'docs/02_Simulation_Architecture.md', prefix: 'ARCH' },
  { file: 'docs/03_Content_Configuration_Specification.md', prefix: 'CONT' },
  { file: 'docs/04_Presentation_Integration_Contract.md', prefix: 'PIC' },
  { file: 'docs/05_Technical_Design_Specification.md', prefix: 'TDS' },
  { file: 'docs/07_Reference_Implementation_and_Client_Design.md', prefix: 'REF' },
];

const HEADING = /^#{2,4}\s+(\d+(?:\.\d+)*)\.?\s/;
const TAG = /\[([A-Z]+-\d+(?:\.\d+)*[a-z]?)\]/g;
const SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage', '.git', '.opencode', 'openspec']);

/** Natural comparison of requirement IDs by prefix then numeric segments. */
export function compareIds(a, b) {
  const dashA = a.indexOf('-');
  const dashB = b.indexOf('-');
  const prefixA = a.slice(0, dashA);
  const prefixB = b.slice(0, dashB);
  if (prefixA !== prefixB) return prefixA < prefixB ? -1 : 1;
  const segA = a
    .slice(dashA + 1)
    .split('.')
    .map((part) => Number.parseInt(part, 10));
  const segB = b
    .slice(dashB + 1)
    .split('.')
    .map((part) => Number.parseInt(part, 10));
  const length = Math.max(segA.length, segB.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (segA[index] ?? 0) - (segB[index] ?? 0);
    if (difference !== 0) return difference < 0 ? -1 : 1;
  }
  return 0;
}

/** Extracts candidate requirement IDs from the numbered headings of 01–05, 07. */
export function extractIds(root = repoRoot) {
  const ids = new Set();
  for (const doc of DOCUMENTS) {
    const path = join(root, doc.file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const match = HEADING.exec(line);
      if (match) ids.add(`${doc.prefix}-${match[1]}`);
    }
  }
  return [...ids].sort(compareIds);
}

/**
 * Parses tools/trace/exempt.yaml: a list of `- id: X` / `reason: Y` entries.
 * Returns the entries and the IDs whose reason is missing or empty.
 */
export function loadExempt(root = repoRoot) {
  const path = join(root, 'tools/trace/exempt.yaml');
  const entries = [];
  if (existsSync(path)) {
    let current = null;
    for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
      const line = rawLine.trim();
      if (line.startsWith('#')) continue;
      const idMatch = /^-\s*id:\s*(.+)$/.exec(line);
      if (idMatch) {
        current = { id: idMatch[1].replace(/["']/g, '').trim(), reason: '' };
        entries.push(current);
        continue;
      }
      const reasonMatch = /^reason:\s*(.+)$/.exec(line);
      if (reasonMatch && current !== null) {
        current.reason = reasonMatch[1].replace(/["']/g, '').trim();
      }
    }
  }
  const errors = entries.filter((entry) => entry.reason.length === 0).map((entry) => entry.id);
  return { entries, errors };
}

/** Parses tools/trace/suffixes.yaml: a list of `- ID` entries. */
export function loadSuffixes(root = repoRoot) {
  const path = join(root, 'tools/trace/suffixes.yaml');
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim())
    .filter((line) => line.length > 0);
}

const walk = (directory, out) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(join(directory, entry.name), out);
    } else if (entry.name.endsWith('.test.ts')) {
      out.push(join(directory, entry.name));
    }
  }
};

/** Maps each `[ID]` tag found in test files to the relative files that use it. */
export function scanTags(root = repoRoot) {
  const files = [];
  walk(root, files);
  const tags = new Map();
  for (const file of files) {
    const relativePath = relative(root, file);
    for (const match of readFileSync(file, 'utf8').matchAll(TAG)) {
      const id = match[1];
      const set = tags.get(id) ?? new Set();
      set.add(relativePath);
      tags.set(id, set);
    }
  }
  return tags;
}

/** Renders the traceability report (VER-3.3). */
export function renderReport(ids, exemptEntries, tags) {
  const exemptById = new Map(exemptEntries.map((entry) => [entry.id, entry.reason]));
  const lines = [
    '# Requirement Traceability',
    '',
    'Generated by `pnpm trace` (tools/trace). Do not edit by hand.',
    '',
    '| Requirement | Status | Tests |',
    '| --- | --- | --- |',
  ];
  for (const id of ids) {
    const tests = [...(tags.get(id) ?? [])].sort();
    const reason = exemptById.get(id);
    const status =
      reason !== undefined ? `exempt: ${reason}` : tests.length > 0 ? 'traced' : 'untraced';
    lines.push(`| ${id} | ${status} | ${tests.join('<br>')} |`);
  }
  const untraced = ids.filter((id) => !exemptById.has(id) && !tags.has(id));
  lines.push('', '## Untraced requirements', '');
  if (untraced.length === 0) {
    lines.push('None.');
  } else {
    for (const id of untraced) lines.push(`- ${id}`);
  }
  lines.push('', '## Tagged IDs outside the extracted documents', '');
  const extra = [...tags.keys()].filter((id) => !ids.includes(id)).sort(compareIds);
  if (extra.length === 0) {
    lines.push('None.');
  } else {
    for (const id of extra) lines.push(`- ${id}`);
  }
  lines.push('');
  return lines.join('\n');
}

/** Runs the tool; returns the process exit code. */
export function run({ root = repoRoot, out, strict = false, log = console.log } = {}) {
  const ids = extractIds(root);
  const { entries, errors } = loadExempt(root);
  if (errors.length > 0) {
    log(`trace: exemption entries without a reason: ${errors.join(', ')}`);
    return 1;
  }
  const tags = scanTags(root);
  const report = renderReport(ids, entries, tags);
  const outputPath = out ?? join(root, 'docs/traceability.md');
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, report);

  const exemptIds = new Set(entries.map((entry) => entry.id));
  const untraced = ids.filter((id) => !exemptIds.has(id) && !tags.has(id));
  log(
    `trace: ${ids.length} requirements, ${untraced.length} untraced, ${entries.length} exempt -> ${relative(root, outputPath)}`,
  );
  if (untraced.length > 0) {
    log(`trace: untraced IDs: ${untraced.join(', ')}`);
  }
  return strict && untraced.length > 0 ? 1 : 0;
}

const main = () => {
  const args = process.argv.slice(2);
  const strict = args.includes('--strict');
  const rootIndex = args.indexOf('--root');
  const outIndex = args.indexOf('--out');
  const root = rootIndex >= 0 ? resolve(args[rootIndex + 1] ?? repoRoot) : repoRoot;
  const out = outIndex >= 0 ? resolve(args[outIndex + 1] ?? '') : undefined;
  process.exitCode = run({ root, strict, ...(out !== undefined ? { out } : {}) });
};

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
