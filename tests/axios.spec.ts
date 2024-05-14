import { test, expect } from '@playwright/test';

test('axios', async ({ page }) => {
  let num = 0
  page.on('request', request => {
    if (request.url().startsWith('https://localhost/authors')) {
      num++
    }
  })

  await page.goto('https://localhost/axios');
  await page.waitForLoadState('networkidle');
  expect(num).toBe(3);
  await expect(page.getByTestId('book')).toHaveCount(4);
});
