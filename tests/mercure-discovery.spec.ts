import { test, expect } from '@playwright/test';

const hub = 'https://localhost/.well-known/mercure'

test('the link attributes of the hub are honoured', async ({ page }) => {
  const subscriptions: URL[] = []
  page.on('request', (request) => {
    if (request.url().startsWith(hub) && request.method() === 'GET') {
      subscriptions.push(new URL(request.url()))
    }
  })

  await page.goto('https://localhost/mercure-discovery');
  await expect(page.getByTestId('author')).toHaveText('Typed Author');

  expect(subscriptions[0].searchParams.get('last_event_id')).toBe('urn:uuid:5e94c686-2c0b-4f9b-958c-92ccc3bbb4eb');
  expect(subscriptions[0].searchParams.getAll('match')).toEqual(['/typed-authors/1']);

  await page.getByTestId('publish').click({force: true});

  await expect(page.getByTestId('author')).toHaveText('Renamed');
});
