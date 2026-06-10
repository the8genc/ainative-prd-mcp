/**
 * Serves the static 8genC marketing site (home / docs / tools) + its design-system
 * assets from /site. Mounted AFTER the functional routes (/mcp, /.well-known,
 * /access, /health) so it can never shadow them — express.static only matches
 * real files, and the page routes are explicit GETs. No-ops to a JSON landing if
 * the site bundle is missing.
 */

import express from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE = join(__dirname, '..', '..', 'site');
const page = (name) => join(SITE, name);

export function mountMarketing(app, { fallbackInfo } = {}) {
  if (!existsSync(page('index.html'))) {
    if (fallbackInfo) app.get('/', fallbackInfo);
    console.error('[site] marketing bundle missing — serving JSON landing at /');
    return false;
  }
  // Design-system assets: /styles.css, /site.css, /tokens/*, /icons.js, /site.js, /assets/*
  app.use(express.static(SITE, { index: false }));
  // Pages
  app.get('/', (_req, res) => res.sendFile(page('index.html')));
  app.get('/docs', (_req, res) => res.sendFile(page('docs.html')));
  app.get('/tools', (_req, res) => res.sendFile(page('tools.html')));
  return true;
}
