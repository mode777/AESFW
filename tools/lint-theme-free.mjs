/**
 * Theme-free lint for framework source and fixtures (TDS-4.3 rule 7, design
 * D3). Scans every text file under `packages/**` and `fixtures/**` for
 * reference-package identifiers (`ref.` tokens) and the reference codes of
 * the denylist module. `reference/**` is exempt by construction: only the two
 * framework roots are scanned.
 *
 * Usage: node tools/lint-theme-free.mjs [root]
 * The root defaults to the repository root. Missing scan roots are clean.
 * Exits 1 and reports `path:line: pattern` for every finding.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REFERENCE_CODE_DENYLIST } from './theme-free-denylist.mjs';

const repoRoot = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_ROOTS = ['packages', 'fixtures'];
const SKIPPED_DIRECTORIES = new Set(['node_modules', 'dist', 'coverage', '.git']);
const SKIPPED_FILES = new Set(['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock']);

/** `ref.` followed by an identifier character, not preceded by one. */
const REFERENCE_TOKEN = /(^|[^A-Za-z0-9_])ref\.[A-Za-z0-9_]/;
const CODE_PATTERNS = REFERENCE_CODE_DENYLIST.map((code) => ({
  label: code,
  pattern: new RegExp(`\\b${code}\\b`),
}));

const listFiles = (directory) => {
  const files = [];
  for (const entry of readdirSync(directory)) {
    if (SKIPPED_FILES.has(entry)) continue;
    const absolute = join(directory, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry)) files.push(...listFiles(absolute));
    } else {
      files.push(absolute);
    }
  }
  return files;
};

const findings = [];
for (const scanRoot of SCAN_ROOTS) {
  const rootDirectory = join(repoRoot, scanRoot);
  let files = [];
  try {
    files = listFiles(rootDirectory);
  } catch {
    continue; // a missing scan root (e.g. fixtures/ before row 1.15) is clean
  }
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      if (REFERENCE_TOKEN.test(line)) {
        findings.push(
          `${relative(repoRoot, file)}:${index + 1}: reference identifier token 'ref.'`,
        );
      }
      for (const { label, pattern } of CODE_PATTERNS) {
        if (pattern.test(line)) {
          findings.push(`${relative(repoRoot, file)}:${index + 1}: reference code '${label}'`);
        }
      }
    });
  }
}

if (findings.length > 0) {
  for (const finding of findings) console.error(`theme-free: ${finding}`);
  console.error(`theme-free: ${findings.length} finding(s) in framework source or fixtures`);
  process.exit(1);
}
