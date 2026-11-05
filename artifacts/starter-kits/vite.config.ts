import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type UserConfig } from 'vite';
import { staticRoutes } from './build/static-routes';
import { socialPreview } from './build/social-preview';

export default defineConfig(async ({ command }): Promise<UserConfig> => {
  // Static builds need no listening port. Development defaults to 5173; PORT overrides it.
  const port = command === 'serve' ? Number(process.env.PORT || 5173) : undefined;
  if (port !== undefined && (!Number.isInteger(port) || port < 1 || port > 65535)) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  const rawBase = process.env.BASE_PATH ?? '/';
  if (!/^\/(?:[A-Za-z0-9_.-]+\/?)*$/.test(rawBase) ||
      rawBase.split('/').some(segment => segment === '.' || segment === '..')) {
    throw new Error('BASE_PATH must be an absolute URL path, such as / or /starter-kits/.');
  }
  const basePath = rawBase.replace(/\/?$/, '/');
  return {
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    staticRoutes(),
    socialPreview(basePath, process.env.PUBLIC_SITE_URL),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
  };
});
