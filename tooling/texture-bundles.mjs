import { readdirSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';

const MODULE_ID = 'virtual:texture-bundles';
const RESOLVED_ID = `\0${MODULE_ID}`;

function readDirectory(path) {
  try {
    return readdirSync(path, { withFileTypes: true });
  } catch (error) {
    // A folder can disappear while a bundle is being copied or removed.
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

export function readTextureBundles(root) {
  return readDirectory(root)
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const files = readDirectory(resolve(root, entry.name)).filter((file) => file.isFile());
      const maps = ['Color', 'Roughness', 'NormalGL', 'Displacement', 'AmbientOcclusion']
        .map((suffix) => files.find((file) => new RegExp(`_${suffix}\\.(?:jpe?g|png|webp)$`, 'i').test(file.name))?.name);
      if (maps.some((file) => !file)) return [];
      return [{
        name: entry.name,
        paths: maps.map((file) => `/textures/${encodeURIComponent(entry.name)}/${encodeURIComponent(file)}`),
      }];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** @returns {import('vite').Plugin} */
export function textureBundlesPlugin(root = resolve(process.cwd(), 'public', 'textures')) {
  let canRefresh = false;
  return {
    name: 'texture-bundles',
    configResolved(config) {
      canRefresh = config.command === 'serve';
    },
    resolveId(id) {
      if (id === MODULE_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id === RESOLVED_ID) {
        return `export const canRefresh = ${canRefresh}; export default ${JSON.stringify(readTextureBundles(root))};`;
      }
    },
    hotUpdate: {
      order: 'post',
      handler({ file }) {
        const path = relative(root, file);
        if (path === '' || (!path.startsWith('..') && !isAbsolute(path))) {
          // Keep Vite's public-asset index updated, but don't propagate texture
          // file changes to the viewer's module graph or send a page reload.
          return [];
        }
      },
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] !== '/__texture-bundles') return next();
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (request.method !== 'GET') {
          response.statusCode = 405;
          response.setHeader('Allow', 'GET');
          response.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }
        try {
          response.end(JSON.stringify(readTextureBundles(root)));
        } catch {
          response.statusCode = 500;
          response.end(JSON.stringify({ error: 'Unable to read texture bundles' }));
        }
      });
    },
  };
}
