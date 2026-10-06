import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { environmentDefaultsPlugin } from '../tooling/environment-defaults.mjs';

test('development save validates origin and ranges and persists the JSON', async () => {
  const root = await mkdtemp(join(tmpdir(), 'bedroom-defaults-'));
  try {
    await mkdir(join(root, 'components/room'), { recursive: true });
    let handler;
    environmentDefaultsPlugin().configureServer({
      config: { root },
      middlewares: {
        use: (_path, callback) => {
          handler = callback;
        },
      },
    });
    const defaults = JSON.parse(
      await readFile(
        new URL(
          '../components/room/environment-defaults.json',
          import.meta.url,
        ),
        'utf8',
      ),
    );
    const request = async (data, origin = 'http://localhost:3000') => {
      const req = Readable.from([JSON.stringify(data)]);
      Object.assign(req, {
        url: '/',
        method: 'POST',
        headers: { origin, host: 'localhost:3000' },
      });
      const res = { statusCode: 0, setHeader() {}, end() {} };
      await handler(req, res, () => assert.fail('Unexpected fallthrough'));
      return res.statusCode;
    };
    assert.equal(await request(defaults, 'http://example.com'), 403);
    assert.equal(await request({ ...defaults, hdriIntensity: 99 }), 400);
    assert.equal(await request(defaults), 200);
    const persisted = JSON.parse(
      await readFile(
        join(root, 'components/room/environment-defaults.json'),
        'utf8',
      ),
    );
    assert.deepEqual(persisted, defaults);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
