import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import history from "connect-history-api-fallback";
import { splitVendorChunkPlugin } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3000,
    open: true,
    proxy: {},
    fs: {
      allow: ['..']
    },
    middlewareMode: false,
    configureServer: (server) => {
      server.middlewares.use(
        history({
          disableDotRule: true,
          htmlAcceptHeaders: ['text/html', 'application/xhtml+xml']
        })
      );
    }
  },
  preview: {
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            if (id.includes('@radix-ui')) {
              return 'ui-vendor';
            }
            if (id.includes('recharts')) {
              return 'chart-vendor';
            }
            if (id.includes('react-hook-form')) {
              return 'form-vendor';
            }
            if (id.includes('lucide-react')) {
              return 'icon-vendor';
            }
            return 'vendor';
          }
          
          // App chunks
          if (id.includes('/dashboard/')) {
            return 'dashboard';
          }
          if (id.includes('/teachers/') || id.includes('services/teachers')) {
            return 'teachers';
          }
          if (id.includes('/students/') || id.includes('services/students')) {
            return 'students';
          }
          if (id.includes('/generic/') || id.includes('useEntityManagerV2')) {
            return 'generic-system';
          }
        }
      }
    },
    chunkSizeWarningLimit: 800
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
