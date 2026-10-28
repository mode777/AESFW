import AxeBuilder from '@axe-core/playwright';
import { expect, test } from 'playwright/test';

/**
 * Accessibility scans (REF-15, REF-16): the HUD, a residence panel, place mode,
 * and the routes window must have no serious or critical violations.
 *
 * Source: REF-15, REF-16
 */
const scan = async (page: import('playwright/test').Page): Promise<void> => {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(
    serious.map((violation) => `${violation.id}: ${violation.nodes.length}`),
    JSON.stringify(serious.map((violation) => violation.id)),
  ).toEqual([]);
};

test('[REF-15] the HUD has no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('hud')).toBeVisible();
  await scan(page);
});

test('[REF-15] a residence panel has no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid^="entity-item-"]').first().click();
  await expect(page.getByTestId('context-panel-body')).toBeVisible();
  await scan(page);
});

test('[REF-15] place mode has no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('build-entry-ref.tier.entity.residence_s1').click();
  await expect(page.getByTestId('location-grid')).toBeVisible();
  await scan(page);
});

test('[REF-15] the routes window has no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('action-window-routes').click();
  await expect(page.getByTestId('window-routes')).toBeVisible();
  await scan(page);
});
