/**
 * Ambient-API traps for pure-package test runs (TDS-5.5, design D4).
 *
 * `Math.random`, `Date.now`, and `crypto.getRandomValues` are replaced for
 * the whole worker: vitest itself does not read them. `performance.now` is
 * read by vitest internals (environment, module, and import timing) from
 * inside the worker, so its trap discriminates by caller: calls whose stack
 * originates from `node_modules` (vitest, vite-node, tinypool) return the
 * real duration, every other call — i.e. any call from package or test
 * source — throws. Registered via `setupFiles` on the core, content,
 * protocol, app, and testkit projects in `vitest.config.ts`; shell and
 * reference projects keep stock globals. Browser-mode reuse is a property of
 * the setupFiles mechanism, so `add-browser-determinism-check` (0.9) can
 * register the same file.
 */
import { afterEach, beforeEach } from 'vitest';

const trapped = (name: string): never => {
  throw new Error(`ambient API '${name}' is trapped in pure-package tests (TDS-5.3, TDS-5.5)`);
};

const trapMathRandom = (): never => trapped('Math.random');
const trapDateNow = (): never => trapped('Date.now');
const trapCryptoGetRandomValues = (): never => trapped('crypto.getRandomValues');

Math.random = trapMathRandom as typeof Math.random;
Date.now = trapDateNow as typeof Date.now;

const performanceGlobal = globalThis.performance as { now: () => number } | undefined;
const originalPerformanceNow =
  performanceGlobal !== undefined ? performanceGlobal.now.bind(performanceGlobal) : undefined;

if (performanceGlobal !== undefined && originalPerformanceNow !== undefined) {
  const trapPerformanceNow = (): number => {
    // Vitest's own reads have a tooling frame (under node_modules) as the
    // immediate caller; reads from package or test source do not.
    const lines = (new Error().stack ?? '').split('\n');
    const trapFrame = lines.findIndex((line) => line.includes('vitest.purity-setup'));
    const callerFrame = trapFrame >= 0 ? (lines[trapFrame + 1] ?? '') : '';
    if (!callerFrame.includes('node_modules')) {
      trapped('performance.now');
    }
    return originalPerformanceNow();
  };
  performanceGlobal.now = trapPerformanceNow;
}

const cryptoGlobal = (globalThis as { crypto?: Crypto }).crypto;
if (cryptoGlobal !== undefined && typeof cryptoGlobal.getRandomValues === 'function') {
  cryptoGlobal.getRandomValues = trapCryptoGetRandomValues as typeof cryptoGlobal.getRandomValues;
}
