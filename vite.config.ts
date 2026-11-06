import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { nodeAuthHandler } from './server/authProxy';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const serverEnv = loadEnv(mode, process.cwd(), '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        { name: 'gesco-auth-api', configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (!req.url?.startsWith('/api/auth/')) return next();
            void nodeAuthHandler(req, res, serverEnv);
          });
        } },
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['logo-dark.png', 'logo-light.png'],
          manifest: {
            name: 'GESCO — Gestion Scolaire',
            short_name: 'GESCO',
            description: 'Plateforme intégrée de gestion scolaire',
            theme_color: '#3b82f6',
            background_color: '#09090b',
            display: 'standalone',
            start_url: '/',
            icons: [
              { src: '/logo-dark.png', sizes: 'any', type: 'image/png', purpose: 'any maskable' }
            ]
          },
          workbox: {
            // Never precache the HTML shell: a stale service worker can otherwise
            // keep booting a retired JS bundle after a Vercel deployment.
            globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
            navigateFallback: null,
            runtimeCaching: [
              {
                urlPattern: ({ request }) => request.mode === 'navigate',
                handler: 'NetworkFirst',
                options: { cacheName: 'gesco-pages', networkTimeoutSeconds: 5, expiration: { maxEntries: 10 } },
              },
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'CacheFirst',
                options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } }
              }
            ]
          }
        })
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          '@src': path.resolve(__dirname, 'src'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks(id) {
              // Separate heavy chart library
              if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-')) {
                return 'recharts';
              }
              // Separate heavy Excel library
              if (id.includes('@e965/xlsx') || id.includes('xlsx')) {
                return 'xlsx';
              }
              // Keep legacy migration utilities out of the main vendor chunk.
              if (id.includes('@neondatabase')) {
                return 'neon';
              }
              // Separate icon library (lucide-react is large ~200KB unpacked)
              if (id.includes('lucide-react')) {
                return 'lucide';
              }
              // Core React vendor
              if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
                return 'vendor';
              }
            }
          }
        },
        // Raise limit slightly since xlsx and recharts are legitimate large deps
        chunkSizeWarningLimit: 600,
      }
    };
});








