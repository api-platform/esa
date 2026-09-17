import { test, expect } from '@playwright/test';

const hub = 'https://localhost/.well-known/mercure'

test('a family shares one subscription that the fetched resources join', async ({ page }) => {
  const subscriptions: URL[] = []
  page.on('request', (request) => {
    if (request.url().startsWith(hub) && request.method() === 'GET') {
      subscriptions.push(new URL(request.url()))
    }
  })

  await page.goto('https://localhost/mercure-urlpattern');
  await expect(page.getByTestId('author-1')).toHaveText('Author 1');

  const last = () => subscriptions[subscriptions.length - 1]
  expect(last().searchParams.getAll('match_urlpattern')).toEqual(['/pattern-authors/:id']);
  expect(last().searchParams.getAll('match')).toEqual([]);

  await page.getByTestId('publish-3').click({force: true});
  await expect(page.getByTestId('family')).toHaveText('Never fetched 1');
});

test('the family outlives the resources fetched from it', async ({ page }) => {
  await page.goto('https://localhost/mercure-urlpattern');
  await expect(page.getByTestId('author-1')).toHaveText('Author 1');

  await page.getByTestId('close-fetched').click({force: true});
  await page.getByTestId('publish-3').click({force: true});
  await expect(page.getByTestId('family')).toHaveText('Never fetched 1');

  await page.getByTestId('unsubscribe').click({force: true});
  await page.getByTestId('publish-3').click({force: true});
  await expect(page.getByTestId('family')).toHaveText('Never fetched 1');
});

test('a subscriber chooses how the payload is parsed', async ({ page }) => {
  await page.goto('https://localhost/mercure-urlpattern');
  await expect(page.getByTestId('author-1')).toHaveText('Author 1');

  await page.getByTestId('publish-text').click({force: true});

  await expect(page.getByTestId('raw')).toHaveText('a text payload');
  await expect(page.getByTestId('errors')).toHaveText('1');
});
