import { test, expect } from '@playwright/test';

test('tanstack query', async ({ page }) => {
  let num = 0
  page.on('request', request => {
    if (request.url().startsWith('https://localhost/authors')) {
      num++
    }
  })

  await page.goto('https://localhost/tanstack-query');
  await page.waitForLoadState('networkidle');
  expect(num).toBe(3);
  await expect(page.getByTestId('book')).toHaveCount(4);
});
