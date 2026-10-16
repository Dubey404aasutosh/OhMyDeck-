import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the built dist/ folder works from any URL path
  // (GitHub Pages sub-folder, Netlify, a USB stick served by any static server).
  base: './',
  // Fonts, stickers and favicon. (The old public/ folder is no longer used.)
  publicDir: 'static',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
