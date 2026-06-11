#!/usr/bin/env node
/**
 * Локальная проверка виджета: статика сайта + proxy /api/site-assistant → :3080
 * Запуск: node scripts/local-assistant-preview.mjs
 */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const PORT = Number(process.env.PREVIEW_PORT || 8765);
const API_TARGET = process.env.SITE_ASSISTANT_URL || 'http://127.0.0.1:3080';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
};

async function proxy(req, res) {
  const url = API_TARGET + req.url;
  const headers = { ...req.headers, host: new URL(API_TARGET).host };
  delete headers['host'];

  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);

  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
    });
    const text = await upstream.text();
    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(text);
  } catch (e) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'assistant_unreachable', detail: String(e.message || e) }));
  }
}

async function staticFile(req, res) {
  let path = req.url.split('?')[0];
  try {
    path = decodeURIComponent(path);
  } catch {
    /* keep raw path */
  }
  if (path === '/') path = '/index.html';
  const rel = path.replace(/^\/+/, '');
  const file = join(ROOT, rel);

  try {
    let data = await readFile(file);
    if (path.endsWith('openclaw-assistant-config.js')) {
      const patch =
        '\n// local preview override\n' +
        'window.OPENCLAW_ASSISTANT = { enabled: true, apiBase: "/api/site-assistant" };\n';
      data = Buffer.from(data.toString('utf8') + patch);
    }
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/api/site-assistant')) return proxy(req, res);
  return staticFile(req, res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Preview: http://127.0.0.1:${PORT}`);
  console.log(`API proxy → ${API_TARGET}`);
});
