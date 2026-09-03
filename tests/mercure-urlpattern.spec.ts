import { test, expect } from '@playwright/test';

const hub = 'https://localhost/.well-known/mercure?'

test('mercure url pattern', async ({ page }) => {
  const subscriptions: string[] = []
  page.on('request', request => {
    const url = request.url()
    if (request.method() === 'GET' && url.startsWith(hub)) {
      subscriptions.push(url.substring(hub.length))
    }
  })

  await page.goto('https://localhost/mercure-urlpattern');
  await expect(page.getByTestId('ready')).toHaveText('ready');

  // Two resources of the same family, and a single subscription expressed as
  // one URL Pattern — no `match=` subscription at all.
  expect(subscriptions).toEqual(['match_urlpattern=%2Fauthors%2F%3Aid']);

  // An update on a topic the page did fetch.
  await page.getByTestId('publish-1').click();
  await expect(page.getByTestId('received')).toContainText('/authors/1: Soyuka');

  // And one on a topic it never fetched: the pattern covers the whole family.
  await page.getByTestId('publish-3').click();
  await expect(page.getByTestId('received')).toContainText('/authors/3: Emily Rodda');

  // Still one connection: joining an existing matcher must not reconnect.
  expect(subscriptions).toHaveLength(1);
});
