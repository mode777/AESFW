import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'playwright/test';

/**
 * The REF-14.6 client budgets, measured on the verification box:
 *
 * - frame time while panning and zooming the world with all known locations at
 *   location level, R3 content: p95 ≤ 8 ms;
 * - delta application plus selector recomputation per published tick: p95 ≤ 2 ms;
 * - time to first interactive frame (cold, R3 content): ≤ 2 s, median of 5 runs.
 *
 * Results are written to `perf-results.json` next to the Playwright report so a
 * run can be compared over time.
 *
 * Source: REF-14.6, VER-14
 */
const results: Record<string, number> = {};

test.afterAll(() => {
  writeFileSync(join(process.cwd(), 'perf-results.json'), `${JSON.stringify(results, null, 2)}\n`);
});

const percentile = (values: readonly number[], fraction: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(fraction * sorted.length));
  return sorted[index] ?? 0;
};

test('[REF-14.6] pan and zoom stay inside the frame budget', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('world-canvas')).toBeVisible();
  // The budget is the work done per frame, not the frame interval: the browser
  // caps rAF at the display rate (~16.7 ms), so sampling intervals would fail on
  // a fast client. The canvas marks its own render and the HUD update marks
  // theirs; both are summed per frame.
  const samples = await page.evaluate(async () => {
    const frameTimes: number[] = [];
    let last = performance.now();
    // A fixed tour: drag across the canvas, zoom in and out, drag back.
    const canvas = document.querySelector('[data-testid="world-canvas"]');
    if (canvas === null) return frameTimes;
    const box = canvas.getBoundingClientRect();
    const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const waypoints = [
      { x: centre.x - 200, y: centre.y },
      { x: centre.x + 200, y: centre.y + 120 },
      { x: centre.x, y: centre.y - 150 },
    ];
    canvas.dispatchEvent(
      new PointerEvent('pointerdown', { clientX: centre.x, clientY: centre.y, bubbles: true }),
    );
    for (const point of waypoints) {
      for (let step = 0; step < 12; step += 1) {
        canvas.dispatchEvent(
          new PointerEvent('pointermove', {
            clientX: centre.x + ((point.x - centre.x) * step) / 12,
            clientY: centre.y + ((point.y - centre.y) * step) / 12,
            bubbles: true,
          }),
        );
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }
    canvas.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    for (let step = 0; step < 20; step += 1) {
      canvas.dispatchEvent(
        new WheelEvent('wheel', {
          deltaY: step < 10 ? -120 : 120,
          bubbles: true,
          cancelable: true,
        }),
      );
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
    return performance
      .getEntriesByType('measure')
      .filter((entry) => entry.name === 'aesfw:frame')
      .map((entry) => entry.duration);
  });
  const p95 = percentile(samples.slice(2), 0.95);
  results['frame_p95_ms'] = p95;
  results['frame_samples'] = samples.length;
  expect(samples.length).toBeGreaterThan(20);
  expect(p95, `frame p95 ${p95.toFixed(1)} ms`).toBeLessThanOrEqual(8);
});

test('[REF-14.6] delta application and selectors stay inside the tick budget', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('action-tick')).toContainText('tick 0');
  // Run at ×16 so the worker publishes ticks continuously.
  for (let index = 0; index < 4; index += 1) {
    await page.getByTestId('action-speed-up').click();
  }
  await page.getByTestId('action-play').click();
  await page.waitForTimeout(3000);
  await page.getByTestId('action-pause').click();
  const durations = await page.evaluate(() =>
    performance
      .getEntriesByType('measure')
      .filter((entry) => entry.name === 'aesfw:delta')
      .map((entry) => entry.duration),
  );
  const p95 = percentile(durations, 0.95);
  results['tick_p95_ms'] = p95;
  expect(durations.length).toBeGreaterThan(5);
  expect(p95, `delta p95 ${p95.toFixed(2)} ms`).toBeLessThanOrEqual(2);
});

test('[REF-14.6] cold start reaches the first interactive frame in budget', async ({ page }) => {
  const times: number[] = [];
  for (let run = 0; run < 5; run += 1) {
    const started = Date.now();
    await page.goto('/');
    await expect(page.getByTestId('hud')).toBeVisible();
    await expect(page.getByTestId('action-tick')).toBeVisible();
    times.push(Date.now() - started);
  }
  const median = percentile(times, 0.5);
  results['cold_start_median_ms'] = median;
  expect(median, `cold start median ${median} ms`).toBeLessThanOrEqual(2000);
});
