import { test, expect } from '@playwright/test';

test('react js', async ({ page }) => {
  let num = 0
  let books = 0
  page.on('request', request => {
    if (request.url().startsWith('https://localhost/authors')) {
      num++
    }
    if (request.url().startsWith('https://localhost/books')) {
      books++
    }
  })

  await page.goto('https://localhost/react');
  await page.waitForLoadState('networkidle');
  expect(num).toBe(3);
  expect(books).toBe(5);
  await expect(page.getByTestId('book')).toHaveCount(4);
});
