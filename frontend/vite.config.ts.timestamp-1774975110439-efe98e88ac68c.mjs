// vite.config.ts
import { defineConfig } from "file:///app/node_modules/vite/dist/node/index.js";
import react from "file:///app/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///app/node_modules/lovable-tagger/dist/index.js";
import history from "file:///app/node_modules/connect-history-api-fallback/lib/index.js";
import { VitePWA } from "file:///app/node_modules/vite-plugin-pwa/dist/index.js";
var __vite_injected_original_dirname = "/app";
var vite_config_default = defineConfig(({ mode }) => ({
  define: {
    "process.env.NODE_ENV": JSON.stringify(mode)
  },
  server: {
    host: "::",
    port: 3e3,
    open: false,
    hmr: false,
    allowedHosts: ["atis.sim.edu.az", ".sim.edu.az", "localhost", "127.0.0.1", "5.9.43.157", "192.168.61.43"],
    // Proxy disabled - using production API URL directly (Nginx handles routing)
    proxy: void 0,
    fs: {
      allow: [
        path.resolve(__vite_injected_original_dirname, ".."),
        path.resolve(__vite_injected_original_dirname, "../shared")
      ]
    },
    middlewareMode: false,
    configureServer: (server) => {
      server.middlewares.use(
        history({
          disableDotRule: true,
          htmlAcceptHeaders: ["text/html", "application/xhtml+xml"],
          rewrites: [
            // Don't rewrite API requests
            { from: /^\/api\/.*$/, to: (context) => context.parsedUrl.path },
            // Don't rewrite Sanctum requests
            { from: /^\/sanctum\/.*$/, to: (context) => context.parsedUrl.path }
          ]
        })
      );
    }
  },
  preview: {
    port: 3e3
  },
  build: {
    minify: mode === "production" ? "terser" : "esbuild",
    // Remove console statements in production only when explicitly enabled
    ...mode === "production" && process.env.VITE_DROP_CONSOLE === "true" ? {
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ["console.log", "console.info", "console.debug", "console.warn"]
        }
      }
    } : {},
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-router": ["react-router-dom"],
          "vendor-ui": ["@radix-ui/react-dialog", "@radix-ui/react-select", "@radix-ui/react-popover"],
          "vendor-forms": ["react-hook-form", "zod", "@hookform/resolvers"],
          "vendor-charts": ["recharts"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-icons": ["lucide-react"],
          "vendor-utils": ["clsx", "class-variance-authority", "date-fns"]
        }
      }
    },
    chunkSizeWarningLimit: 500,
    // Lower threshold for better optimization
    target: "esnext",
    reportCompressedSize: false
    // Disable gzip size reporting for faster builds
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.ico", "pwa-icon.svg", "apple-touch-icon-180x180.png"],
      manifest: {
        name: "AT\u0130S - T\u0259hsil \u0130dar\u0259etm\u0259 Sistemi",
        short_name: "AT\u0130S",
        description: "Az\u0259rbaycan Respublikas\u0131 T\u0259hsil Nazirliyi - M\u0259kt\u0259b \u0130dar\u0259etm\u0259 Sistemi",
        theme_color: "#1e3a8a",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        lang: "az",
        categories: ["education", "productivity"],
        icons: [
          {
            src: "pwa-64x64.png",
            sizes: "64x64",
            type: "image/png"
          },
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/sanctum\//],
        runtimeCaching: [
          {
            // API calls - NetworkFirst (həmişə fresh data, offline olduqda cache)
            urlPattern: /\/api\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "atis-api-cache",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60
                // 1 saat
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Google Fonts və digər static fonts
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
                // 1 il
              }
            }
          }
        ],
        offlineGoogleAnalytics: false,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true
      },
      devOptions: {
        enabled: false,
        // Dev-də false, production-da işləyir
        type: "module"
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src"),
      "@shared": path.resolve(__vite_injected_original_dirname, "../shared")
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvYXBwXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvYXBwL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9hcHAvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcbmltcG9ydCBoaXN0b3J5IGZyb20gXCJjb25uZWN0LWhpc3RvcnktYXBpLWZhbGxiYWNrXCI7XG5pbXBvcnQgeyBzcGxpdFZlbmRvckNodW5rUGx1Z2luIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSAndml0ZS1wbHVnaW4tcHdhJztcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+ICh7XG4gIGRlZmluZToge1xuICAgICdwcm9jZXNzLmVudi5OT0RFX0VOVic6IEpTT04uc3RyaW5naWZ5KG1vZGUpLFxuICB9LFxuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiBcIjo6XCIsXG4gICAgcG9ydDogMzAwMCxcbiAgICBvcGVuOiBmYWxzZSxcbiAgICBobXI6IGZhbHNlLFxuICAgIGFsbG93ZWRIb3N0czogW1wiYXRpcy5zaW0uZWR1LmF6XCIsIFwiLnNpbS5lZHUuYXpcIiwgXCJsb2NhbGhvc3RcIiwgXCIxMjcuMC4wLjFcIiwgXCI1LjkuNDMuMTU3XCIsIFwiMTkyLjE2OC42MS40M1wiXSxcbiAgICAvLyBQcm94eSBkaXNhYmxlZCAtIHVzaW5nIHByb2R1Y3Rpb24gQVBJIFVSTCBkaXJlY3RseSAoTmdpbnggaGFuZGxlcyByb3V0aW5nKVxuICAgIHByb3h5OiB1bmRlZmluZWQsXG4gICAgZnM6IHtcbiAgICAgIGFsbG93OiBbXG4gICAgICAgIHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLicpLFxuICAgICAgICBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vc2hhcmVkJyksXG4gICAgICBdXG4gICAgfSxcbiAgICBtaWRkbGV3YXJlTW9kZTogZmFsc2UsXG4gICAgY29uZmlndXJlU2VydmVyOiAoc2VydmVyKSA9PiB7XG4gICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKFxuICAgICAgICBoaXN0b3J5KHtcbiAgICAgICAgICBkaXNhYmxlRG90UnVsZTogdHJ1ZSxcbiAgICAgICAgICBodG1sQWNjZXB0SGVhZGVyczogWyd0ZXh0L2h0bWwnLCAnYXBwbGljYXRpb24veGh0bWwreG1sJ10sXG4gICAgICAgICAgcmV3cml0ZXM6IFtcbiAgICAgICAgICAgIC8vIERvbid0IHJld3JpdGUgQVBJIHJlcXVlc3RzXG4gICAgICAgICAgICB7IGZyb206IC9eXFwvYXBpXFwvLiokLywgdG86IChjb250ZXh0KSA9PiBjb250ZXh0LnBhcnNlZFVybC5wYXRoIH0sXG4gICAgICAgICAgICAvLyBEb24ndCByZXdyaXRlIFNhbmN0dW0gcmVxdWVzdHNcbiAgICAgICAgICAgIHsgZnJvbTogL15cXC9zYW5jdHVtXFwvLiokLywgdG86IChjb250ZXh0KSA9PiBjb250ZXh0LnBhcnNlZFVybC5wYXRoIH0sXG4gICAgICAgICAgXVxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9XG4gIH0sXG4gIHByZXZpZXc6IHtcbiAgICBwb3J0OiAzMDAwLFxuICB9LFxuICBidWlsZDoge1xuICAgIG1pbmlmeTogbW9kZSA9PT0gJ3Byb2R1Y3Rpb24nID8gJ3RlcnNlcicgOiAnZXNidWlsZCcsXG4gICAgLy8gUmVtb3ZlIGNvbnNvbGUgc3RhdGVtZW50cyBpbiBwcm9kdWN0aW9uIG9ubHkgd2hlbiBleHBsaWNpdGx5IGVuYWJsZWRcbiAgICAuLi4obW9kZSA9PT0gJ3Byb2R1Y3Rpb24nICYmIHByb2Nlc3MuZW52LlZJVEVfRFJPUF9DT05TT0xFID09PSAndHJ1ZSdcbiAgICAgID8ge1xuICAgICAgICB0ZXJzZXJPcHRpb25zOiB7XG4gICAgICAgICAgY29tcHJlc3M6IHtcbiAgICAgICAgICAgIGRyb3BfY29uc29sZTogdHJ1ZSxcbiAgICAgICAgICAgIGRyb3BfZGVidWdnZXI6IHRydWUsXG4gICAgICAgICAgICBwdXJlX2Z1bmNzOiBbJ2NvbnNvbGUubG9nJywgJ2NvbnNvbGUuaW5mbycsICdjb25zb2xlLmRlYnVnJywgJ2NvbnNvbGUud2FybiddLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9XG4gICAgICA6IHt9KSxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgJ3ZlbmRvci1yZWFjdCc6IFsncmVhY3QnLCAncmVhY3QtZG9tJ10sXG4gICAgICAgICAgJ3ZlbmRvci1yb3V0ZXInOiBbJ3JlYWN0LXJvdXRlci1kb20nXSxcbiAgICAgICAgICAndmVuZG9yLXVpJzogWydAcmFkaXgtdWkvcmVhY3QtZGlhbG9nJywgJ0ByYWRpeC11aS9yZWFjdC1zZWxlY3QnLCAnQHJhZGl4LXVpL3JlYWN0LXBvcG92ZXInXSxcbiAgICAgICAgICAndmVuZG9yLWZvcm1zJzogWydyZWFjdC1ob29rLWZvcm0nLCAnem9kJywgJ0Bob29rZm9ybS9yZXNvbHZlcnMnXSxcbiAgICAgICAgICAndmVuZG9yLWNoYXJ0cyc6IFsncmVjaGFydHMnXSxcbiAgICAgICAgICAndmVuZG9yLXF1ZXJ5JzogWydAdGFuc3RhY2svcmVhY3QtcXVlcnknXSxcbiAgICAgICAgICAndmVuZG9yLWljb25zJzogWydsdWNpZGUtcmVhY3QnXSxcbiAgICAgICAgICAndmVuZG9yLXV0aWxzJzogWydjbHN4JywgJ2NsYXNzLXZhcmlhbmNlLWF1dGhvcml0eScsICdkYXRlLWZucyddLFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDUwMCwgLy8gTG93ZXIgdGhyZXNob2xkIGZvciBiZXR0ZXIgb3B0aW1pemF0aW9uXG4gICAgdGFyZ2V0OiAnZXNuZXh0JyxcbiAgICByZXBvcnRDb21wcmVzc2VkU2l6ZTogZmFsc2UsIC8vIERpc2FibGUgZ3ppcCBzaXplIHJlcG9ydGluZyBmb3IgZmFzdGVyIGJ1aWxkc1xuICB9LFxuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICBtb2RlID09PSAnZGV2ZWxvcG1lbnQnICYmXG4gICAgY29tcG9uZW50VGFnZ2VyKCksXG4gICAgVml0ZVBXQSh7XG4gICAgICByZWdpc3RlclR5cGU6ICdhdXRvVXBkYXRlJyxcbiAgICAgIGluamVjdFJlZ2lzdGVyOiAnYXV0bycsXG4gICAgICBpbmNsdWRlQXNzZXRzOiBbJ2Zhdmljb24uaWNvJywgJ3B3YS1pY29uLnN2ZycsICdhcHBsZS10b3VjaC1pY29uLTE4MHgxODAucG5nJ10sXG4gICAgICBtYW5pZmVzdDoge1xuICAgICAgICBuYW1lOiAnQVRcdTAxMzBTIC0gVFx1MDI1OWhzaWwgXHUwMTMwZGFyXHUwMjU5ZXRtXHUwMjU5IFNpc3RlbWknLFxuICAgICAgICBzaG9ydF9uYW1lOiAnQVRcdTAxMzBTJyxcbiAgICAgICAgZGVzY3JpcHRpb246ICdBelx1MDI1OXJiYXljYW4gUmVzcHVibGlrYXNcdTAxMzEgVFx1MDI1OWhzaWwgTmF6aXJsaXlpIC0gTVx1MDI1OWt0XHUwMjU5YiBcdTAxMzBkYXJcdTAyNTlldG1cdTAyNTkgU2lzdGVtaScsXG4gICAgICAgIHRoZW1lX2NvbG9yOiAnIzFlM2E4YScsXG4gICAgICAgIGJhY2tncm91bmRfY29sb3I6ICcjZmZmZmZmJyxcbiAgICAgICAgZGlzcGxheTogJ3N0YW5kYWxvbmUnLFxuICAgICAgICBvcmllbnRhdGlvbjogJ3BvcnRyYWl0LXByaW1hcnknLFxuICAgICAgICBzY29wZTogJy8nLFxuICAgICAgICBzdGFydF91cmw6ICcvJyxcbiAgICAgICAgbGFuZzogJ2F6JyxcbiAgICAgICAgY2F0ZWdvcmllczogWydlZHVjYXRpb24nLCAncHJvZHVjdGl2aXR5J10sXG4gICAgICAgIGljb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgc3JjOiAncHdhLTY0eDY0LnBuZycsXG4gICAgICAgICAgICBzaXplczogJzY0eDY0JyxcbiAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgc3JjOiAncHdhLTE5MngxOTIucG5nJyxcbiAgICAgICAgICAgIHNpemVzOiAnMTkyeDE5MicsXG4gICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHNyYzogJ3B3YS01MTJ4NTEyLnBuZycsXG4gICAgICAgICAgICBzaXplczogJzUxMng1MTInLFxuICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZycsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBzcmM6ICdtYXNrYWJsZS1pY29uLTUxMng1MTIucG5nJyxcbiAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXG4gICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJyxcbiAgICAgICAgICAgIHB1cnBvc2U6ICdtYXNrYWJsZScsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICB3b3JrYm94OiB7XG4gICAgICAgIGdsb2JQYXR0ZXJuczogWycqKi8qLntqcyxjc3MsaHRtbCxpY28scG5nLHN2Zyx3b2ZmLHdvZmYyfSddLFxuICAgICAgICBuYXZpZ2F0ZUZhbGxiYWNrOiAnL2luZGV4Lmh0bWwnLFxuICAgICAgICBuYXZpZ2F0ZUZhbGxiYWNrRGVueWxpc3Q6IFsvXlxcL2FwaVxcLy8sIC9eXFwvc2FuY3R1bVxcLy9dLFxuICAgICAgICBydW50aW1lQ2FjaGluZzogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIC8vIEFQSSBjYWxscyAtIE5ldHdvcmtGaXJzdCAoaFx1MDI1OW1pXHUwMTVGXHUwMjU5IGZyZXNoIGRhdGEsIG9mZmxpbmUgb2xkdXFkYSBjYWNoZSlcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9cXC9hcGlcXC8vLFxuICAgICAgICAgICAgaGFuZGxlcjogJ05ldHdvcmtGaXJzdCcsXG4gICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogJ2F0aXMtYXBpLWNhY2hlJyxcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xuICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDIwMCxcbiAgICAgICAgICAgICAgICBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwLCAvLyAxIHNhYXRcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgbmV0d29ya1RpbWVvdXRTZWNvbmRzOiAxMCxcbiAgICAgICAgICAgICAgY2FjaGVhYmxlUmVzcG9uc2U6IHtcbiAgICAgICAgICAgICAgICBzdGF0dXNlczogWzAsIDIwMF0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgLy8gR29vZ2xlIEZvbnRzIHZcdTAyNTkgZGlnXHUwMjU5ciBzdGF0aWMgZm9udHNcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9eaHR0cHM6XFwvXFwvZm9udHNcXC4oZ29vZ2xlYXBpc3xnc3RhdGljKVxcLmNvbS8sXG4gICAgICAgICAgICBoYW5kbGVyOiAnQ2FjaGVGaXJzdCcsXG4gICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogJ2dvb2dsZS1mb250cycsXG4gICAgICAgICAgICAgIGV4cGlyYXRpb246IHtcbiAgICAgICAgICAgICAgICBtYXhFbnRyaWVzOiAxMCxcbiAgICAgICAgICAgICAgICBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQgKiAzNjUsIC8vIDEgaWxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgICAgb2ZmbGluZUdvb2dsZUFuYWx5dGljczogZmFsc2UsXG4gICAgICAgIGNsZWFudXBPdXRkYXRlZENhY2hlczogdHJ1ZSxcbiAgICAgICAgc2tpcFdhaXRpbmc6IHRydWUsXG4gICAgICAgIGNsaWVudHNDbGFpbTogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBkZXZPcHRpb25zOiB7XG4gICAgICAgIGVuYWJsZWQ6IGZhbHNlLCAvLyBEZXYtZFx1MDI1OSBmYWxzZSwgcHJvZHVjdGlvbi1kYSBpXHUwMTVGbFx1MDI1OXlpclxuICAgICAgICB0eXBlOiAnbW9kdWxlJyxcbiAgICAgIH0sXG4gICAgfSksXG4gIF0uZmlsdGVyKEJvb2xlYW4pLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxuICAgICAgXCJAc2hhcmVkXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi4vc2hhcmVkXCIpLFxuICAgIH0sXG4gIH0sXG59KSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQThMLFNBQVMsb0JBQW9CO0FBQzNOLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUyx1QkFBdUI7QUFDaEMsT0FBTyxhQUFhO0FBRXBCLFNBQVMsZUFBZTtBQU54QixJQUFNLG1DQUFtQztBQVN6QyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssT0FBTztBQUFBLEVBQ3pDLFFBQVE7QUFBQSxJQUNOLHdCQUF3QixLQUFLLFVBQVUs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
