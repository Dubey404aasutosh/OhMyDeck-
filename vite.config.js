import { defineConfig } from 'vite';
import { resolve } from 'path';
import { palettePreview } from './palette/preview-plugin.js';

export default defineConfig({
  plugins: [
    {
      name: 'route-404',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/404' || req.url === '/404/') {
            req.url = '/404.html';
          }
          next();
        });
      }
    },
    // Dev-only colour palette switcher (top of the page on localhost). Not included in builds.
    palettePreview()
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        notFound: resolve(__dirname, '404.html')
      }
    }
  }
});
