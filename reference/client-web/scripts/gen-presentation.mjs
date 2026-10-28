#!/usr/bin/env node
/**
 * Converts the reference presentation package into client data (REF-14.4,
 * design D1). A headless host never loads presentation packages (PIC-5), so the
 * client ships the resolved catalogue as a generated JSON module instead of
 * parsing YAML in the browser.
 *
 * Run by `prebuild` and by the verify task, which diffs the output against the
 * committed file.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const packageDir = join(here, '..', '..', 'content', 'ref.tier.presentation');
const target = join(here, '..', 'src', 'content', 'generated', 'presentation.generated.ts');

const read = (name) => parse(readFileSync(join(packageDir, name), 'utf8'));

const manifest = read('package.yaml').package;
const localization = read('localization.en.yaml').localization;
const mappings = read('mappings.yaml');
const formatting = read('formatting.yaml').formatting;

const presentation = {
  package_id: manifest.id,
  package_version: manifest.version,
  locale: localization.locale,
  entries: localization.entries,
  mappings: (mappings.presentation_mapping ?? []).map((mapping) => ({
    definition_id: mapping.target_definition,
    category_key: mapping.display?.category_key ?? null,
    sort_order: mapping.display?.sort_order ?? 0,
    fallback_shape: mapping.visual?.fallback_shape ?? null,
  })),
  fallback: mappings.fallback ?? null,
  formatting,
};

mkdirSync(dirname(target), { recursive: true });
// Prettier formats the emitted module so the checked-in file passes the
// repository's format check without a separate write step.
const body = `export const PRESENTATION_DATA = ${JSON.stringify(presentation, null, 2)} as const;`;
const banner = [
  '/**',
  ' * Generated from `reference/content/ref.tier.presentation` by',
  ' * `scripts/gen-presentation.mjs`. Do not edit by hand; run the script.',
  ' *',
  ' * Source: REF-14.4',
  ' */',
  body,
  '',
].join('\n');
writeFileSync(target, banner);
process.stdout.write(`wrote ${target}\n`);
