import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export function environmentDefaultsPlugin() {
  return {
    name: 'room-environment-defaults',
    apply: 'serve',
    configureServer(server) {
      const target = resolve(
        server.config.root,
        'components/room/environment-defaults.json',
      );
      server.middlewares.use(
        '/api/room/environment-defaults',
        async (request, response, next) => {
          if (request.url !== '/' && request.url !== '') return next();
          response.setHeader('Content-Type', 'application/json');
          const reply = (status, message) => {
            response.statusCode = status;
            response.end(JSON.stringify({ message }));
          };
          if (request.method !== 'POST') return reply(405, 'POST required');
          // This development-only endpoint writes one fixed project file.
          try {
            if (
              !request.headers.origin ||
              new URL(request.headers.origin).host !== request.headers.host
            )
              return reply(403, 'Same-origin request required');
            let body = '';
            for await (const chunk of request) {
              body += chunk;
              if (Buffer.byteLength(body) > 4096)
                return reply(413, 'Payload too large');
            }
            const input = JSON.parse(body);
            if (!input || !['indoor', 'daysky'].includes(input.hdriSource))
              return reply(400, 'Invalid HDRI');
            const values = { hdriSource: input.hdriSource };
            for (const [key, min, max] of [
              ['hdriIntensity', 0, 2],
              ['ambientIntensity', 0, 2],
              ['directionalIntensity', 0, 10],
              ['directionalDirection', -180, 180],
              ['directionalElevation', 0, 90],
              ['ceilingLightIntensity', 0, 20],
              ['ceilingLightTemperature', 1800, 10000],
            ]) {
              const value = input[key];
              if (
                typeof value !== 'number' ||
                !Number.isFinite(value) ||
                value < min ||
                value > max
              )
                return reply(400, `Invalid ${key}`);
              values[key] = value;
            }
            await writeFile(
              target,
              JSON.stringify(values, null, 2) + '\n',
              'utf8',
            );
            reply(200, 'Saved');
          } catch (error) {
            reply(
              error instanceof SyntaxError ? 400 : 500,
              'Could not save defaults',
            );
          }
        },
      );
    },
  };
}
