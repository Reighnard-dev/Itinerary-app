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

function svgForOgPreview() {
  const manropeB64 = readFileSync('public/fonts/manrope-variable.ttf').toString('base64');
  const dmSansB64 = readFileSync('public/fonts/dmsans-variable.ttf').toString('base64');
  return `<!doctype html>
<html>
<head>
<style>
  @font-face { font-family: 'Manrope'; src: url(data:font/ttf;base64,${manropeB64}) format('truetype'); font-weight: 100 900; }
  @font-face { font-family: 'DM Sans'; src: url(data:font/ttf;base64,${dmSansB64}) format('truetype'); font-weight: 100 900; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    width: 1200px;
    height: 630px;
    background: radial-gradient(circle at 14% 18%, #f5cf4326 0%, transparent 42%),
                radial-gradient(circle at 86% 82%, #f5cf432b 0%, transparent 46%),
                #faf5ea;
    color: #262923;
    font-family: 'DM Sans', sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }
  .ring {
    position: absolute;
    border: 1.5px solid #e6e2cf;
    border-radius: 50%;
    pointer-events: none;
  }
  .card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 24px;
    padding: 40px 64px;
    position: relative;
    z-index: 2;
  }
  .lockup {
    display: flex;
    align-items: center;
    gap: 22px;
  }
  .wordmark {
    font-family: 'Manrope', sans-serif;
    font-weight: 800;
    font-size: 112px;
    letter-spacing: -5.5px;
    line-height: 1;
    color: #262923;
  }
  .dot {
    color: #dab128;
    margin-left: -4px;
  }
  .tagline {
    font-family: 'Manrope', sans-serif;
    font-weight: 700;
    font-size: 32px;
    letter-spacing: -0.7px;
    color: #3f4439;
    margin: 0;
  }
  .sub {
    font-size: 21px;
    color: #77796f;
    margin: -10px 0 0;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: #fffdf5;
    border: 1.5px solid #e6e3d3;
    border-radius: 999px;
    padding: 10px 22px;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 0.4px;
    color: #5d6154;
  }
  .pill-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #f5cd3c;
  }
</style>
</head>
<body>
  <div class="ring" style="width:940px;height:940px;"></div>
  <div class="ring" style="width:1280px;height:1280px;border-style:dashed;"></div>
  <div class="card">
    <div class="lockup">
      ${svgForIcon(128, false)}
      <div class="wordmark">roam<span class="dot">.</span></div>
    </div>
    <p class="tagline">Plan your travel itinerary.</p>
    <p class="sub">Iconic sights, hidden gems, and day-by-day adventures.</p>
    <div class="pill"><span class="pill-dot"></span>250+ countries · Web, iOS, Android &amp; Huawei</div>
  </div>
</body>
</html>`;
}

const targets = [
  { file: 'public/icons/apple-touch-icon.png', url: '/icons/apple-touch-icon.png', width: 180, height: 180, maskable: true, og: false },
  { file: 'public/icons/icon-192.png', url: '/icons/icon-192.png', width: 192, height: 192, maskable: false, og: false },
  { file: 'public/icons/icon-512.png', url: '/icons/icon-512.png', width: 512, height: 512, maskable: false, og: false },
  { file: 'public/icons/icon-maskable-512.png', url: '/icons/icon-maskable-512.png', width: 512, height: 512, maskable: true, og: false },
  { file: 'public/og-logo.png', url: '/og-logo.png', width: 1200, height: 630, maskable: false, og: true },
];

const browser = await chromium.launch({ headless: true, channel: 'chrome' }).catch(() => chromium.launch({ headless: true }));
try {
  const approvedPath = 'research/rights/approved-assets.json';
  const evidencePath = 'research/rights/asset-evidence.json';
  const approved = JSON.parse(readFileSync(approvedPath, 'utf8'));
  const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));

  for (const target of targets) {
    const page = await browser.newPage({ viewport: { width: target.width, height: target.height }, deviceScaleFactor: 1 });
    if (target.og) {
      await page.setContent(svgForOgPreview());
      await page.screenshot({ path: target.file });
    } else {
      await page.setContent(`<!doctype html><html><body style="margin:0;padding:0;overflow:hidden;background:transparent">${svgForIcon(target.width, target.maskable)}</body></html>`);
      await page.screenshot({ path: target.file, omitBackground: true });
    }
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
    console.log(`Generated ${target.file} (${target.width}x${target.height}, sha256=${sha256.slice(0, 12)}...)`);
  }

  writeFileSync(approvedPath, JSON.stringify(approved, null, 2) + '\n');
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
  console.log('Updated research/rights/approved-assets.json and asset-evidence.json');
} finally {
  await browser.close();
}
