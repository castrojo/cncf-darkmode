import { test, expect } from '@playwright/test';

// CORRECT tab list — verified by source analysis
// There is NO "End Users" tab
const TABS = ['Everyone', 'Platinum', 'Gold', 'Silver'] as const;
const DATA_TABS = ['everyone', 'platinum', 'gold', 'silver', 'academic', 'architectures'] as const;

for (const tab of TABS) {
  test(`${tab} tab is clickable @endusers`, async ({ page }) => {
    await page.goto('./');
    const tabBtn = page.locator(`button.section-link[data-tab="${tab.toLowerCase()}"]`);
    await tabBtn.click();
    await expect(page.locator('main')).toBeVisible();
    // Tab should be marked active
    await expect(tabBtn).toHaveClass(/active/);
  });
}

test('Academic & Nonprofit tab is clickable @endusers', async ({ page }) => {
  await page.goto('./');
  const tabBtn = page.locator('button.section-link[data-tab="academic"]');
  await tabBtn.click();
  await expect(page.locator('main')).toBeVisible();
  await expect(tabBtn).toHaveClass(/active/);
});

test('Reference Architectures tab is clickable @endusers', async ({ page }) => {
  await page.goto('./');
  const tabBtn = page.locator('button.section-link[data-tab="architectures"]');
  await tabBtn.click();
  await expect(page.locator('main')).toBeVisible();
  await expect(tabBtn).toHaveClass(/active/);
});

test('all 6 tabs exist in DOM @endusers', async ({ page }) => {
  await page.goto('./');
  for (const tab of DATA_TABS) {
    await expect(page.locator(`button.section-link[data-tab="${tab}"]`)).toBeVisible();
  }
});

test('tab 6 keyboard shortcut activates Reference Architectures @endusers', async ({ page }) => {
  await page.goto('./');
  await page.keyboard.press('6');
  const archTabBtn = page.locator('button.section-link[data-tab="architectures"]');
  await expect(archTabBtn).toHaveClass(/active/);
});

test('no phantom End Users tab exists @endusers', async ({ page }) => {
  await page.goto('./');
  const endUserTab = page.locator('button.section-link[data-tab="end-users"], button.section-link[data-tab="endusers"]');
  expect(await endUserTab.count()).toBe(0);
});
