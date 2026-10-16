import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
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
    }
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        notFound: resolve(import.meta.dirname, '404.html')
      }
    }
  }
});
