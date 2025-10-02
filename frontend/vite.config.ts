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
    open: false,
    allowedHosts: ["atis.sim.edu.az", ".sim.edu.az", "localhost", "127.0.0.1", "5.9.43.157"],
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/sanctum': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    },
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
    minify: mode === 'production' ? 'terser' : 'esbuild',
    // Remove console statements in production using Terser
    ...(mode === 'production' && {
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn']
        }
      }
    }),
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
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
