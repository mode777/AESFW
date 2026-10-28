import { expect, test } from 'playwright/test';

test('[VER-13.2] smoke flow 1: load and the tick advances', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('action-tick')).toContainText('tick 0');
  await page.getByTestId('action-step').click();
  await expect(page.getByTestId('action-tick')).toContainText('tick 1');
});

test('[VER-13.2] smoke flow 2: inspect an entity', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('action-window-inspector').click();
  await page.locator('[data-testid^="entity-item-"]').first().click();
  await expect(page.getByTestId('inspector')).toContainText('ref.tier.');
});

test('[VER-13.2] smoke flow 4: toggle an entity', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('action-window-inspector').click();
  await page.locator('[data-testid^="entity-item-"]').first().click();
  const toggle = page.getByTestId('inspector-toggle-enabled');
  await expect(toggle).toContainText('disable');
  await toggle.click();
  await page.getByTestId('action-step').click();
  await expect(toggle).toContainText('enable');
});

test('[VER-13.2] smoke flow 6: save and reload', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('action-step').click();
  await page.getByTestId('action-save').click();
  await page.getByTestId('action-load').click();
  await expect(page.getByTestId('action-tick')).toContainText('tick 1');
});
