import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['logo.jpg'],
        manifest: {
          name: 'ELECTRO MEN - Composants Électroniques & Sourcing',
          short_name: 'ELECTRO MEN',
          description: 'Vente de composants électroniques et service de sourcing sur-mesure au Burkina Faso.',
          lang: 'fr',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          orientation: 'portrait-primary',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/maskable-icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg}'],
          navigateFallbackDenylist: [/\/api\//],
          runtimeCaching: [
            {
              // Affiche instantanément la version en cache pendant que la nouvelle est récupérée en fond —
              // idéal pour quelqu'un de pressé sur une connexion lente.
              urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/api/products'),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'products-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 },
              },
            },
            {
              // Photos produits hébergées sur Supabase Storage : rarement modifiées une fois publiées,
              // donc on les garde en cache longue durée pour un chargement instantané au retour.
              urlPattern: ({ url }: { url: URL }) => url.pathname.includes('/storage/v1/object/public/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'product-images-cache',
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: true,
      watch: {},
    },
    build: {
      chunkSizeWarningLimit: 1000,
    },
  };
});
