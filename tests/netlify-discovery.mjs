import {test} from 'node:test';
import {once} from 'node:events';
import express from 'express';
import {chromium, devices, expect} from '@playwright/test';

test('the Netlify build exposes the full destination picker on mobile', async () => {
  const liveUrl = process.argv[2];
  const server = liveUrl ? undefined : express().use(express.static('dist')).listen(0, '127.0.0.1');
  try {
    if (server) await once(server, 'listening');
    const baseURL = liveUrl || `http://127.0.0.1:${server.address().port}`;
    const browser = await chromium.launch({channel:'chrome'});
    try {
      const page = await browser.newPage({...devices['iPhone 13'], baseURL});
      await page.goto('/');
      await page.getByRole('button', {name:/^Choose country:/}).click();
      const count = page.locator('.destination-kicker[role=status]');
      await expect(count).toHaveText('250 countries & territories', {timeout:15000});
      await page.getByRole('searchbox', {name:'Search countries'}).fill('Vietnam');
      await page.getByRole('button', {name:'Vietnam', exact:true}).click();

      await page.getByRole('button', {name:/^Choose city:/}).click();
      await expect(count).toHaveText('315 cities & towns');
      await page.getByRole('searchbox', {name:'Search cities'}).fill('Hanoi');
      await page.getByRole('button', {name:'Hanoi', exact:true}).click();
      await page.getByRole('button', {name:'Find my adventure'}).click();
      await expect(page.locator('.destination-tag')).toContainText('Hanoi, Vietnam');
      await expect(page.locator('.place-card').first()).toBeVisible({timeout:15000});
    } finally {
      await browser.close();
    }
  } finally {
    server?.close();
  }
});
