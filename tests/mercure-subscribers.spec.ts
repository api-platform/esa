import { test, expect } from '@playwright/test';

const hubA = 'https://localhost/.well-known/mercure'
const hubB = 'https://localhost:8443/.well-known/mercure'

const matches = (url: string) => new URL(url).searchParams.getAll('match')

test('every subscriber of a hub receives its own updates', async ({ page }) => {
  await page.goto('https://localhost/mercure-subscribers');
  await expect(page.getByTestId('author-1')).toHaveText('Dan Simmons');
  await expect(page.getByTestId('author-2')).toHaveText('O\'Donnell, Peter');

  await page.getByTestId('publish').click({force: true});

  await expect(page.getByTestId('author-1')).toHaveText('Soyuka');
  await expect(page.getByTestId('author-2')).toHaveText('O\'Donnell, Peter');
});

test('a hub is subscribed to its own topics only', async ({ page }) => {
  const subscriptions: {hub: string, topics: string[]}[] = []
  page.on('request', (request) => {
    for (const hub of [hubA, hubB]) {
      if (request.url().startsWith(hub)) {
        subscriptions.push({hub, topics: matches(request.url())})
      }
    }
  })

  await page.goto('https://localhost/mercure-subscribers');
  await expect(page.getByTestId('other-author-1')).toHaveText('Simmons, Dan');

  const last = (hub: string) => subscriptions.filter((s) => s.hub === hub).pop()?.topics
  expect(last(hubA)).toEqual(['/authors/1', '/authors/2']);
  expect(last(hubB)).toEqual(['/other-authors/1']);
});
