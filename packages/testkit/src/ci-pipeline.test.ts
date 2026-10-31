/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = join(import.meta.dirname, '../../..');
const readWorkflow = (name: string): string =>
  readFileSync(join(repoRoot, '.github/workflows', name), 'utf8');

const runCommands = (workflow: string): string[] =>
  [...workflow.matchAll(/^\s*- name:.*$|^\s*run:\s*(.+)$/gm)]
    .map((match) => match[1])
    .filter((command): command is string => command !== undefined);

describe('[VER-15.3] CI pipeline skeleton', () => {
  it('[VER-15.3] workflow stages appear in VER-15.3 order with frozen-lockfile install', () => {
    const ci = readWorkflow('ci.yml');
    expect(ci).toContain('pull_request:');
    expect(ci).toContain('push:');

    const commands = runCommands(ci);
    const expectedOrder = [
      'pnpm install --frozen-lockfile',
      'pnpm format:check',
      'pnpm lint',
      'pnpm type-check',
      'pnpm test',
    ];
    let cursor = -1;
    for (const stage of expectedOrder) {
      const index = commands.indexOf(stage, cursor + 1);
      expect(index, `${stage} must appear after the preceding VER-15.3 stage`).toBeGreaterThan(
        cursor,
      );
      cursor = index;
    }
  });
});
