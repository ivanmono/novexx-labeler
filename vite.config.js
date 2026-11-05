import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { mkdirSync, writeFileSync } from 'node:fs';

// Dev only: the touch test (#/touchtest) posts each result here, so a run on the real panel lands in
// touchtest-results/ on the dev machine (start the server with --host to reach it from the board).
const touchTestSink = () => ({
  name: 'touchtest-sink',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/__touchtest', (req, res) => {
      if (req.method !== 'POST') return void (res.statusCode = 405, res.end());
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        try {
          const { part = 'result' } = JSON.parse(body);
          const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 23);
          mkdirSync('touchtest-results', { recursive: true });
          writeFileSync(`touchtest-results/${stamp}-${String(part).replace(/W/g, '')}.json`, body);
          res.statusCode = 204;
        } catch {
          res.statusCode = 400;
        }
        res.end();
      });
    });
  },
});

export default defineConfig({
  plugins: [tailwindcss(), touchTestSink()],
  // Relative base so the built bundle can be opened from any folder on the device.
  base: './',
  build: {
    target: 'chrome111',
    outDir: 'dist',
    sourcemap: true,
  },
  server: { strictPort: true },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.js'],
  },
});
