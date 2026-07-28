import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
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
            // Cache all static assets aggressively
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
            runtimeCaching: [
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
              // Separate Supabase client
              if (id.includes('@supabase')) {
                return 'supabase';
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








