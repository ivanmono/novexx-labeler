import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
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
