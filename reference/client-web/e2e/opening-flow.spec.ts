import { expect, test } from 'playwright/test';

/**
 * The M11a opening flow (REF-18): the steps a first-time player performs, in
 * order. The flow is data-driven so a step can be replayed or extended without
 * touching the test body.
 *
 * The long-horizon parts of the script (first S1→S2 advancement, transport,
 * trade) need hundreds of simulated ticks and are covered headlessly by SCN-14
 * with the same content; this flow asserts that every step is reachable through
 * the client, not the simulation outcome of each one.
 *
 * Source: REF-18, VER-13.2
 */
interface OpeningStep {
  readonly id: string;
  readonly run: (page: import('playwright/test').Page) => Promise<void>;
}

const steps: readonly OpeningStep[] = [
  {
    id: 'build-menu',
    run: async (page) => {
      await expect(page.getByTestId('build-menu')).toBeVisible();
      await expect(page.getByTestId('build-tab-ref.tier.category.s1')).toBeVisible();
    },
  },
  {
    id: 'select-residence',
    run: async (page) => {
      await page.getByTestId('build-entry-ref.tier.entity.residence_s1').click();
      await expect(page.getByTestId('location-grid')).toBeVisible();
    },
  },
  {
    id: 'place-residence',
    run: async (page) => {
      const grid = page.getByTestId('location-grid');
      const box = await grid.boundingBox();
      if (box === null) throw new Error('no grid box');
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.getByTestId('action-step').click();
    },
  },
  {
    id: 'inspect-entity',
    run: async (page) => {
      await page.locator('[data-testid^="entity-item-"]').first().click();
      await expect(page.getByTestId('context-panel-body')).toBeVisible();
      await expect(page.getByTestId('context-title')).not.toBeEmpty();
    },
  },
  {
    id: 'statistics',
    run: async (page) => {
      await page.getByTestId('action-window-statistics').click();
      await expect(page.getByTestId('window-statistics')).toBeVisible();
      await expect(page.getByTestId('statistics-pyramid')).toBeVisible();
    },
  },
  {
    id: 'routes',
    run: async (page) => {
      await page.getByTestId('action-window-routes').click();
      await expect(page.getByTestId('window-routes')).toBeVisible();
    },
  },
  {
    id: 'exchange',
    run: async (page) => {
      await page.getByTestId('action-window-exchange').click();
      await expect(page.getByTestId('window-exchange')).toBeVisible();
    },
  },
  {
    id: 'milestones',
    run: async (page) => {
      await expect(page.getByTestId('milestone-list')).toBeVisible();
      await expect(page.getByTestId('milestone-residence')).toHaveAttribute(
        'data-complete',
        'true',
      );
    },
  },
];

test('[REF-18] the opening flow is reachable through the client', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('hud')).toBeVisible();
  for (const step of steps) {
    await test.step(step.id, async () => {
      await step.run(page);
    });
  }
});
