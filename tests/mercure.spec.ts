import { test, expect } from '@playwright/test';

test('mercure', async ({ page }) => {
  let num = 0
  let requestedMercure = false
  let subscribedToBoth = false
  let unsubscribedAuthor1 = false
  page.on('request', request => {
    if (request.url().startsWith('https://localhost/authors')) {
      num++
    }

    if (request.url().startsWith('https://localhost/.well-known/mercure?topic=%2Fauthors%2F1')) {
      requestedMercure = true
    }

    if (request.url().startsWith('https://localhost/.well-known/mercure?topic=%2Fauthors%2F1&topic=%2Fauthors%2F2')) {
      subscribedToBoth = true
    }

    if (request.url().startsWith('https://localhost/.well-known/mercure?topic=%2Fauthors%2F2')) {
      unsubscribedAuthor1 = true
    }
  })

  await page.goto('https://localhost/mercure');

  // await page.waitForLoadState('networkidle');
  expect(num).toBe(1);
  expect(requestedMercure).toBe(true);

  await expect(page.getByTestId('result')).toHaveText('viewing /authors/1: Dan Simmons');
  const button = page.getByTestId('mercure');
  await button.waitFor();
  await button.click();
  await expect(page.getByTestId('result')).toHaveText('viewing /authors/1: Soyuka');
  await page.getByTestId('author-2').click();
  await expect(page.getByTestId('result')).toHaveText('viewing /authors/2: O\'Donnell, Peter');
  await page.waitForTimeout(600); // we set gcTime to 500, tanstack query will clear author 1 from cache, therefore we check that mercure gets updated
  expect(unsubscribedAuthor1).toBe(true);
  await page.getByTestId('author-1').click();
  await expect(page.getByTestId('result')).toHaveText('viewing /authors/1: Dan Simmons');
});

