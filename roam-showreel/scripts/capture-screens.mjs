import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..', '..');
const outImagesDir = path.resolve(import.meta.dirname, '..', 'assets', 'images');
const tempDataDir = path.join(rootDir, 'data', 'showreel-capture');
fs.mkdirSync(tempDataDir, { recursive: true });
fs.mkdirSync(outImagesDir, { recursive: true });

const port = '3199';
const baseUrl = `http://127.0.0.1:${port}`;

const server = spawn(process.execPath, [path.join(rootDir, 'dist-server', 'server', 'index.js')], {
  cwd: rootDir,
  env: {
    ...process.env,
    PORT: port,
    DATA_DIR: tempDataDir,
    STATIC_DIR: path.join(rootDir, 'dist'),
    SUPABASE_URL: '',
    SUPABASE_ANON_KEY: '',
    VITE_SUPABASE_URL: '',
    VITE_SUPABASE_ANON_KEY: '',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

server.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
server.stderr.on('data', (d) => process.stderr.write(`[server-err] ${d}`));

async function waitForHealth() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Roam server did not start in time');
}

async function waitImages(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const imgs = Array.from(document.querySelectorAll('img'));
    await Promise.all(
      imgs.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((res) => {
          img.addEventListener('load', res, { once: true });
          img.addEventListener('error', res, { once: true });
          setTimeout(res, 4000);
        });
      })
    );
  });
}

async function dismissToast(page) {
  const btn = page.locator('.toast button');
  if (await btn.count()) {
    await btn.first().click().catch(() => {});
    await page.waitForTimeout(150);
  }
}

try {
  await waitForHealth();
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'chrome' });
  } catch {
    browser = await chromium.launch({ headless: true });
  }
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await waitImages(page);
  await page.waitForTimeout(400);

  // 1. Hero + search panel
  await page.screenshot({ path: path.join(outImagesDir, 'screen-hero.png') });
  console.log('Saved screen-hero.png');

  // 2. Add 3 Kyoto places so the live sidebar is populated, then capture Discover grid
  const addButtons = page.locator('.place-card .add-btn');
  const count = await addButtons.count();
  for (let i = 0; i < Math.min(3, count); i++) {
    await addButtons.nth(i).click();
    await page.waitForTimeout(150);
  }
  await dismissToast(page);
  await page.evaluate(() => window.scrollTo(0, 505));
  await page.waitForTimeout(350);
  await waitImages(page);
  await page.screenshot({ path: path.join(outImagesDir, 'screen-discover.png') });
  console.log('Saved screen-discover.png');

  await page.evaluate(() => window.scrollTo(0, 1080));
  await page.waitForTimeout(350);
  await waitImages(page);
  await page.screenshot({ path: path.join(outImagesDir, 'screen-discover-cards.png') });
  console.log('Saved screen-discover-cards.png');

  // 3. Toggle Interactive Map Preview
  await page.evaluate(() => window.scrollTo(0, 505));
  await page.waitForTimeout(200);
  await page.locator('.explore-map').click();
  await page.waitForTimeout(2200);
  await page.evaluate(() => window.scrollTo(0, 920));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outImagesDir, 'screen-map.png') });
  console.log('Saved screen-map.png');
  await page.locator('.explore-map').click();
  await page.waitForTimeout(250);

  // 4. Open Place Detail Modal (Fushimi Inari Shrine)
  await page.locator('.place-card .card-title').first().click();
  await page.waitForTimeout(1000);
  await waitImages(page);
  await page.screenshot({ path: path.join(outImagesDir, 'screen-detail.png') });
  console.log('Saved screen-detail.png');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  // 5. Switch to Planner View & enrich stops with times + notes
  await page.locator('.trip-preview > .btn').click();
  await page.waitForTimeout(600);
  await waitImages(page);

  const stops = page.locator('.itinerary-stop');
  const stopCount = await stops.count();
  const sampleTimes = ['08:30', '11:00', '14:30'];
  const sampleNotes = [
    'Arrive early for quiet morning light along the upper torii trail.',
    'Grab roasted green tea by the river before entering the bamboo path.',
    'Walk slowly through the moss courtyard and spot the carved stone faces.',
  ];
  for (let i = 0; i < Math.min(3, stopCount); i++) {
    const timeInput = stops.nth(i).locator('input[type="time"]');
    if (await timeInput.count()) {
      await timeInput.fill(sampleTimes[i]);
    }
    const noteBox = stops.nth(i).locator('textarea');
    if (await noteBox.count()) {
      await noteBox.fill(sampleNotes[i]);
    }
  }
  await page.evaluate(() => window.scrollTo(0, 120));
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(outImagesDir, 'screen-planner.png') });
  console.log('Saved screen-planner.png');

  await browser.close();
} finally {
  server.kill();
  await new Promise((r) => setTimeout(r, 600));
  try {
    fs.rmSync(tempDataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 });
  } catch {}
}
