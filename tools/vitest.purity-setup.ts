/**
 * Ambient-API traps for pure-package test runs (TDS-5.5, design D4).
 *
 * `crypto.getRandomValues` is replaced for the whole worker: vitest and
 * fast-check do not read it. `Math.random`, `Date.now`, and `performance.now`
 * are read by tooling internals from inside the worker (vitest for
 * environment, module, and import timing; fast-check for its default seed),
 * so their traps discriminate by caller: calls whose stack originates from
 * `node_modules` return the real value, every other call — i.e. any call from
 * package or test source — throws. Registered via `setupFiles` on the core,
 * content, protocol, app, and testkit projects in `vitest.config.ts`; shell
 * and reference projects keep stock globals. Browser-mode reuse is a property
 * of the setupFiles mechanism, so `add-browser-determinism-check` (0.9) can
 * register the same file.
 */
import { afterEach, beforeEach } from 'vitest';

const trapped = (name: string): never => {
  throw new Error(`ambient API '${name}' is trapped in pure-package tests (TDS-5.3, TDS-5.5)`);
};

const trapCryptoGetRandomValues = (): never => trapped('crypto.getRandomValues');

/** Traps an ambient read except when its immediate caller is tooling under `node_modules`. */
const trapByCaller = <T>(name: string, real: () => T): (() => T) => {
  return () => {
    const lines = (new Error().stack ?? '').split('\n');
    const trapFrame = lines.findIndex((line) => line.includes('vitest.purity-setup'));
    const callerFrame = trapFrame >= 0 ? (lines[trapFrame + 1] ?? '') : '';
    if (!callerFrame.includes('node_modules')) {
      trapped(name);
    }
    return real();
  };
};

const originalMathRandom = Math.random.bind(Math);
Math.random = trapByCaller('Math.random', originalMathRandom) as typeof Math.random;

const originalDateNow = Date.now.bind(Date);
Date.now = trapByCaller('Date.now', originalDateNow) as typeof Date.now;

const performanceGlobal = globalThis.performance as { now: () => number } | undefined;
const originalPerformanceNow =
  performanceGlobal !== undefined ? performanceGlobal.now.bind(performanceGlobal) : undefined;

if (performanceGlobal !== undefined && originalPerformanceNow !== undefined) {
  performanceGlobal.now = trapByCaller('performance.now', originalPerformanceNow);
}

const cryptoGlobal = (globalThis as { crypto?: Crypto }).crypto;
if (cryptoGlobal !== undefined && typeof cryptoGlobal.getRandomValues === 'function') {
  cryptoGlobal.getRandomValues = trapCryptoGetRandomValues as typeof cryptoGlobal.getRandomValues;
}
