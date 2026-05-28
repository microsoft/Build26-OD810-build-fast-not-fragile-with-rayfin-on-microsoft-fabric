import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, createReadStream } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(projectRoot, 'data');

/**
 * Bundles `data/recipes.json` and `data/images/*.jpg` with the static app:
 *
 * - In `vite dev`, files under /seed/* are served straight from ./data/ via
 *   middleware (no copy needed).
 * - In `vite build`, all files under ./data/ are copied to ./dist/seed/ so
 *   the deployed static host serves them at /seed/recipes.json and
 *   /seed/images/*.jpg.
 *
 * The browser-side seed (src/lib/seed.ts) fetches from /seed/* and uploads
 * to Rayfin so the same seed runs locally and on Microsoft Fabric.
 */
function seedAssetsPlugin(): Plugin {
  return {
    name: 'contoso-chef-seed-assets',
    configureServer(server) {
      server.middlewares.use('/seed', (req, res, next) => {
        const url = (req.url ?? '').split('?')[0] ?? '';
        // Map /seed/recipes.json → data/recipes.json, /seed/images/x.jpg → data/images/x.jpg
        const safe = url.replace(/^\/+/, '').replace(/\.\.+/g, '');
        const filePath = join(dataDir, safe || 'recipes.json');
        if (!filePath.startsWith(dataDir) || !existsSync(filePath) || !statSync(filePath).isFile()) {
          next();
          return;
        }
        const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
        const contentType =
          ext === '.json' ? 'application/json' :
          ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
          ext === '.png' ? 'image/png' :
          ext === '.webp' ? 'image/webp' :
          'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=300');
        createReadStream(filePath).pipe(res);
      });
    },
    closeBundle() {
      const outDir = resolve(projectRoot, 'dist', 'seed');
      copyTree(dataDir, outDir);
      // eslint-disable-next-line no-console
      console.log(`[seed-assets] copied data/ → dist/seed/`);
    },
  };
}

function copyTree(src: string, dest: string): void {
  if (!existsSync(src)) return;
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  for (const name of readdirSync(src)) {
    const srcPath = join(src, name);
    const destPath = join(dest, name);
    const st = statSync(srcPath);
    if (st.isDirectory()) {
      copyTree(srcPath, destPath);
    } else if (st.isFile()) {
      mkdirSync(dirname(destPath), { recursive: true });
      copyFileSync(srcPath, destPath);
    }
  }
}

// Rayfin's ApiClient detects a Vite dev environment and rewrites `baseUrl` to
// use Vite's dev-server proxy, so we configure that proxy here. The same
// behaviour means the production build will use the real VITE_RAYFIN_API_URL
// directly, no proxy needed.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_RAYFIN_API_URL || 'http://localhost:5168';
  return {
    plugins: [react(), seedAssetsPlugin()],
    build: { target: 'es2022' },
    esbuild: { target: 'es2022' },
    optimizeDeps: {
      esbuildOptions: { target: 'es2022' },
    },
    server: {
      port: 5173,
      proxy: {
        '/graphql': { target, changeOrigin: true },
        '/api': { target, changeOrigin: true },
        '/storage': { target, changeOrigin: true },
      },
    },
  };
});
