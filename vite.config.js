import { defineConfig } from 'vite';
import { resolve } from 'path';

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
    }
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
