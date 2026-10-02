import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createServer } from 'vite';
import { readTextureBundles, textureBundlesPlugin } from '../tooling/texture-bundles.mjs';

const suffixes = ['Color', 'Roughness', 'NormalGL', 'Displacement', 'AmbientOcclusion'];
function addBundle(root, name, maps = suffixes) {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  for (const map of maps) writeFileSync(join(dir, `${name}_${map}.png`), 'test asset');
}

void test('catalog excludes incomplete bundles and tolerates missing directories', () => {
  const root = mkdtempSync(join(tmpdir(), 'bedroom-textures-'));
  try {
    addBundle(root, 'Complete bundle');
    addBundle(root, 'Still copying', ['Color']);
    const bundles = readTextureBundles(root);
    assert.equal(bundles.length, 1);
    assert.equal(bundles[0].name, 'Complete bundle');
    assert.equal(bundles[0].paths.length, 5);
    assert.match(bundles[0].paths[0], /Complete%20bundle_Color\.png$/);
    assert.deepEqual(readTextureBundles(join(root, 'missing')), []);
    const plugin = textureBundlesPlugin(root);
    assert.deepEqual(plugin.hotUpdate.handler({ file: join(root, 'new.png') }), []);
    assert.equal(plugin.hotUpdate.handler({ file: join(root, '..', 'page.tsx') }), undefined);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

void test('live catalog refresh discovers new assets without sending full-reload', { timeout: 20000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), 'bedroom-texture-server-'));
  const textureRoot = join(root, 'public', 'textures');
  addBundle(textureRoot, 'Original');
  const server = await createServer({
    configFile: false,
    root,
    appType: 'custom',
    logLevel: 'silent',
    plugins: [textureBundlesPlugin(textureRoot)],
    server: { host: '127.0.0.1', port: 0, watch: { usePolling: true, interval: 50 } },
  });
  try {
    await server.listen();
    const base = server.resolvedUrls.local[0];
    const messages = [];
    const send = server.ws.send.bind(server.ws);
    server.ws.send = (...args) => { messages.push(args); return send(...args); };
    const initial = await server.transformRequest('virtual:texture-bundles');
    assert.match(initial.code, /Original/);
    const original = await (await fetch(`${base}__texture-bundles`)).json();

    // Let the initial ignoreInitial scan finish before creating test assets.
    await new Promise((resolve) => setTimeout(resolve, 300));

    const received = new Set();
    const additions = new Promise((resolve, reject) => {
      const timer = setTimeout(() => { server.watcher.off('add', onAdd); reject(new Error('Timed out waiting for texture additions')); }, 8000);
      function onAdd(file) {
        if (file.includes('/NewBundle/') || file.includes('\\NewBundle\\')) received.add(file);
        if (received.size === 5) {
          clearTimeout(timer);
          server.watcher.off('add', onAdd);
          resolve();
        }
      }
      server.watcher.on('add', onAdd);
    });
    addBundle(textureRoot, 'NewBundle');
    await additions;
    const response = await fetch(`${base}__texture-bundles`);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const refreshed = await response.json();
    assert.deepEqual(refreshed.map((bundle) => bundle.name), ['NewBundle', 'Original']);
    assert.deepEqual(refreshed.find((bundle) => bundle.name === 'Original'), original[0]);
    assert.equal((await fetch(new URL(refreshed[0].paths[0], base))).status, 200);
    assert.equal(messages.some(([payload]) => payload?.type === 'full-reload'), false);
    assert.equal((await fetch(`${base}__texture-bundles`, { method: 'POST' })).status, 405);
  } finally {
    await server.close();
    rmSync(root, { recursive: true, force: true });
  }
});
