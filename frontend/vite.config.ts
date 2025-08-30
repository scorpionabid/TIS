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
          // Vendor chunks - finer granularity
          if (id.includes('node_modules')) {
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('react-router') || id.includes('@remix-run/router')) {
              return 'router-vendor';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            
            // UI libraries
            if (id.includes('@radix-ui') || id.includes('react-aria')) {
              return 'ui-vendor';
            }
            if (id.includes('lucide-react') || id.includes('heroicons')) {
              return 'icon-vendor';
            }
            
            // Charts and visualization
            if (id.includes('recharts') || id.includes('d3')) {
              return 'chart-vendor';
            }
            
            // Forms and validation
            if (id.includes('react-hook-form') || id.includes('zod') || id.includes('yup')) {
              return 'form-vendor';
            }
            
            // Date and time libraries
            if (id.includes('date-fns') || id.includes('dayjs') || id.includes('moment')) {
              return 'date-vendor';
            }
            
            // Utility libraries
            if (id.includes('lodash') || id.includes('clsx') || id.includes('class-variance-authority')) {
              return 'utils-vendor';
            }
            
            return 'vendor';
          }
          
          // App feature chunks - more granular
          if (id.includes('/pages/') || id.includes('/components/')) {
            // Authentication
            if (id.includes('auth') || id.includes('login') || id.includes('Auth')) {
              return 'auth';
            }
            
            // Dashboard components
            if (id.includes('/dashboard/') || id.includes('Dashboard')) {
              return 'dashboard';
            }
            
            // User management
            if (id.includes('/users/') || id.includes('User') || id.includes('users.ts')) {
              return 'users';
            }
            
            // Institution management
            if (id.includes('/institutions/') || id.includes('Institution') || id.includes('institutions.ts')) {
              return 'institutions';
            }
            
            // Teacher management
            if (id.includes('/teachers/') || id.includes('Teacher') || id.includes('teachers.ts')) {
              return 'teachers';
            }
            
            // Student management
            if (id.includes('/students/') || id.includes('Student') || id.includes('students.ts')) {
              return 'students';
            }
            
            // Assessment system
            if (id.includes('/assessment') || id.includes('Assessment') || id.includes('assessment')) {
              return 'assessments';
            }
            
            // Survey system
            if (id.includes('/survey') || id.includes('Survey') || id.includes('survey')) {
              return 'surveys';
            }
            
            // Reports and analytics
            if (id.includes('/reports/') || id.includes('Report') || id.includes('Analytics')) {
              return 'reports';
            }
            
            // Settings and admin
            if (id.includes('/settings/') || id.includes('Settings') || id.includes('/admin/')) {
              return 'admin';
            }
          }
          
          // Services
          if (id.includes('/services/')) {
            if (id.includes('BaseService') || id.includes('CacheService')) {
              return 'core-services';
            }
            return 'services';
          }
          
          // Hooks
          if (id.includes('/hooks/')) {
            if (id.includes('useRole') || id.includes('useNavigation') || id.includes('useAuth')) {
              return 'core-hooks';
            }
            return 'hooks';
          }
          
          // Utils and constants
          if (id.includes('/utils/') || id.includes('/constants/')) {
            return 'utils';
          }
          
          // Layout components
          if (id.includes('/layout/') || id.includes('Sidebar') || id.includes('Header')) {
            return 'layout';
          }
          
          // Generic system components
          if (id.includes('/generic/') || id.includes('useEntityManagerV2') || id.includes('EntityManager')) {
            return 'generic-system';
          }
        }
      }
    },
    chunkSizeWarningLimit: 500, // Lower threshold for better optimization
    target: 'esnext',
    minify: 'esbuild', // Use esbuild instead of terser
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
