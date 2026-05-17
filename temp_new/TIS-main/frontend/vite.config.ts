import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import history from "connect-history-api-fallback";
import { splitVendorChunkPlugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  server: {
    host: "::",
    port: 3000,
    open: false,
    hmr: mode === 'production' ? {
      protocol: 'wss',
      host: 'atis.sim.edu.az',
      clientPort: 443,
    } : true,
    allowedHosts: ["atis.sim.edu.az", ".sim.edu.az", "localhost", "127.0.0.1", "5.9.43.157", "192.168.61.43"],
    // Proxy disabled - using production API URL directly (Nginx handles routing)
    proxy: undefined,
    fs: {
      allow: [
        path.resolve(__dirname, '..'),
        path.resolve(__dirname, '../shared'),
      ]
    },
    middlewareMode: false,
    configureServer: (server) => {
      server.middlewares.use(
        history({
          disableDotRule: true,
          htmlAcceptHeaders: ['text/html', 'application/xhtml+xml'],
          rewrites: [
            // Don't rewrite API requests
            { from: /^\/api\/.*$/, to: (context) => context.parsedUrl.path },
            // Don't rewrite Sanctum requests
            { from: /^\/sanctum\/.*$/, to: (context) => context.parsedUrl.path },
          ]
        })
      );
    }
  },
  preview: {
    port: 3000,
  },
  build: {
    minify: mode === 'production' ? 'terser' : 'esbuild',
    // Remove console statements in production only when explicitly enabled
    ...(mode === 'production' && process.env.VITE_DROP_CONSOLE === 'true'
      ? {
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
          },
        },
      }
      : {}),
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-popover'],
          'vendor-forms': ['react-hook-form', 'zod', '@hookform/resolvers'],
          'vendor-charts': ['recharts'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-icons': ['lucide-react'],
          'vendor-utils': ['clsx', 'class-variance-authority', 'date-fns'],
        }
      }
    },
    chunkSizeWarningLimit: 500, // Lower threshold for better optimization
    target: 'esnext',
    reportCompressedSize: false, // Disable gzip size reporting for faster builds
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'pwa-icon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'ATİS - Təhsil İdarəetmə Sistemi',
        short_name: 'ATİS',
        description: 'Azərbaycan Respublikası Təhsil Nazirliyi - Məktəb İdarəetmə Sistemi',
        theme_color: '#1e3a8a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        lang: 'az',
        categories: ['education', 'productivity'],
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/sanctum\//],
        runtimeCaching: [
          {
            // API calls - NetworkFirst (həmişə fresh data, offline olduqda cache)
            urlPattern: /\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'atis-api-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60, // 1 saat
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Google Fonts və digər static fonts
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 il
              },
            },
          },
        ],
        offlineGoogleAnalytics: false,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: false, // Dev-də false, production-da işləyir
        type: 'module',
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
}));
