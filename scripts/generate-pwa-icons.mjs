import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const iconsDir = 'public/icons';
mkdirSync(iconsDir, { recursive: true });

function svgForIcon(size, maskable = false) {
  const rx = maskable ? 0 : Math.round(size * 0.24);
  const scale = maskable ? 0.68 : 0.82;
  const offset = (size * (1 - scale)) / 2;
  // Locally authored basic geometry matching public/favicon.svg
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${rx}" fill="#f5cd3c"/>
    <g transform="translate(${offset}, ${offset}) scale(${(size * scale) / 48})">
      <circle cx="24" cy="24" r="19" fill="none" stroke="#262923" stroke-width="2.2" stroke-opacity="0.16"/>
      <path d="M16 35V13h10a7 7 0 0 1 0 14H16m9 0 8 8" fill="none" stroke="#262923" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="34" cy="14" r="2.6" fill="#262923"/>
    </g>
  </svg>`;
}

const targets = [
  { file: 'public/icons/apple-touch-icon.png', url: '/icons/apple-touch-icon.png', size: 180, maskable: true },
  { file: 'public/icons/icon-192.png', url: '/icons/icon-192.png', size: 192, maskable: false },
  { file: 'public/icons/icon-512.png', url: '/icons/icon-512.png', size: 512, maskable: false },
  { file: 'public/icons/icon-maskable-512.png', url: '/icons/icon-maskable-512.png', size: 512, maskable: true },
];

const browser = await chromium.launch({ headless: true, channel: 'chrome' }).catch(() => chromium.launch({ headless: true }));
try {
  const approvedPath = 'research/rights/approved-assets.json';
  const evidencePath = 'research/rights/asset-evidence.json';
  const approved = JSON.parse(readFileSync(approvedPath, 'utf8'));
  const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));

  for (const target of targets) {
    const page = await browser.newPage({ viewport: { width: target.size, height: target.size }, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><html><body style="margin:0;padding:0;overflow:hidden;background:transparent">${svgForIcon(target.size, target.maskable)}</body></html>`);
    await page.screenshot({ path: target.file, omitBackground: true });
    await page.close();

    const sha256 = createHash('sha256').update(readFileSync(target.file)).digest('hex');
    approved[target.url] = {
      sha256,
      kind: 'locally-authored-basic-geometry-and-text',
      sourceUrl: 'scripts/generate-pwa-icons.mjs',
    };
    evidence[target.url] = {
      sha256,
      sourceUrl: 'scripts/generate-pwa-icons.mjs',
      evidence: 'scripts/generate-pwa-icons.mjs',
      basis: 'Newly authored geometry and text',
    };
    console.log(`Generated ${target.file} (${target.size}x${target.size}, sha256=${sha256.slice(0, 12)}...)`);
  }

  writeFileSync(approvedPath, JSON.stringify(approved, null, 2) + '\n');
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
  console.log('Updated research/rights/approved-assets.json and asset-evidence.json');
} finally {
  await browser.close();
}
