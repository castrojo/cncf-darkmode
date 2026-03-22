import { test, expect } from '@playwright/test';

const TABS = ['Everything', 'Graduated', 'Incubating', 'Sandbox', 'Archived'];

for (const tab of TABS) {
  test(`${tab} tab renders without crashing`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: tab }).click();
    // Cards count varies; just verify the tab switch doesn't crash
    await expect(page.locator('main')).toBeVisible();
  });
}

test('tab 2 keyboard shortcut activates Graduated tab', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('2'); // Graduated
  // Should switch to Graduated tab
  await expect(page.locator('.section-link[data-tab="graduated"]')).toHaveClass(/active/);
});
