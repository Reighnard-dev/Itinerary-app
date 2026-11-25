import { cpSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const outRoot = path.resolve('.vercel', 'output');
const staticDir = path.join(outRoot, 'static');
const functionsDir = path.join(outRoot, 'functions', 'api');

rmSync(outRoot, { recursive: true, force: true });
mkdirSync(staticDir, { recursive: true });
mkdirSync(functionsDir, { recursive: true });

// 1. Copy lean static assets from dist/
cpSync('dist', staticDir, { recursive: true });

// 2. Bundle API routes into .vercel/output/functions/api/<name>.func/
for (const name of ['health', 'config', 'routes', 'download-apk', 'download-ios']) {
  const funcDir = path.join(functionsDir, `${name}.func`);
  mkdirSync(funcDir, { recursive: true });

  const wrapper = `
import * as mod from './api/${name}.ts';

export default async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();
  const fn = mod[method];
  if (typeof fn !== 'function') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  const url = new URL(req.url || '/', proto + '://' + host);
  const chunks = [];
  if (method !== 'GET' && method !== 'HEAD') {
    for await (const chunk of req) chunks.push(chunk);
  }
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers || {})) {
    if (Array.isArray(v)) {
      for (const item of v) headers.append(k, item);
    } else if (typeof v === 'string') {
      headers.set(k, v);
    }
  }
  const webReq = new Request(url.toString(), {
    method,
    headers,
    ...(chunks.length ? { body: Buffer.concat(chunks) } : {}),
  });
  const webRes = await fn(webReq);
  res.statusCode = webRes.status;
  webRes.headers.forEach((value, key) => res.setHeader(key, value));
  const buf = Buffer.from(await webRes.arrayBuffer());
  res.end(buf);
}
`;

  await build({
    stdin: {
      contents: wrapper,
      resolveDir: process.cwd(),
      loader: 'ts',
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    loader: { '.png': 'base64' },
    outfile: path.join(funcDir, 'index.mjs'),
  });

  writeFileSync(path.join(funcDir, 'package.json'), JSON.stringify({ type: 'module' }) + '\n');
  writeFileSync(
    path.join(funcDir, '.vc-config.json'),
    JSON.stringify(
      {
        runtime: 'nodejs22.x',
        handler: 'index.mjs',
        launcherType: 'Nodejs',
        shouldAddHelpers: true,
      },
      null,
      2
    ) + '\n'
  );
}

// 3. Write Build Output API v3 config.json
const imageOrigin = (
  process.env.ROAM_IMAGE_ORIGIN ||
  'https://raw.githubusercontent.com/Reighnard-dev/Itinerary-app/main/public/images/places'
).replace(/\/+$/, '');

const config = {
  version: 3,
  routes: [
    {
      src: '/(.*)',
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-Frame-Options': 'DENY',
        'Permissions-Policy': 'camera=(), microphone=()',
        'Strict-Transport-Security': 'max-age=31536000',
      },
      continue: true,
    },
    {
      src: '/sw\\.js',
      headers: { 'Cache-Control': 'no-cache' },
      continue: true,
    },
    {
      src: '/manifest\\.webmanifest',
      headers: {
        'Content-Type': 'application/manifest+json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
      continue: true,
    },
    {
      src: '/assets/(.*)',
      headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
      continue: true,
    },
    {
      src: '/fonts/(.*)',
      headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
      continue: true,
    },
    {
      src: '/discovery/(.*)',
      headers: { 'Cache-Control': 'public, max-age=0, s-maxage=3600, must-revalidate' },
      continue: true,
    },
    { handle: 'filesystem' },
    {
      src: '/images/places/(.+)',
      dest: `${imageOrigin}/$1`,
      headers: {
        'Cache-Control': 'public, max-age=2592000, s-maxage=31536000',
      },
    },
    { src: '/((?!api/|images/places/).*)', dest: '/index.html' },
  ],
};
writeFileSync(path.join(outRoot, 'config.json'), JSON.stringify(config, null, 2) + '\n');

function walkStats(dir) {
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      const sub = walkStats(full);
      files += sub.files;
      bytes += sub.bytes;
    } else {
      files++;
      bytes += st.size;
    }
  }
  return { files, bytes };
}

const summary = walkStats(outRoot);
console.log(
  JSON.stringify({
    vercelOutputFiles: summary.files,
    vercelOutputMB: Number((summary.bytes / 1048576).toFixed(2)),
  })
);
