import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Plugin } from 'vite';
import { kits } from '../src/data/kits';

/** One app shell per real route; no catch-all rewrite or hash routing needed. */
export function staticRoutes(): Plugin {
  let outDir: string;
  return {
    name: 'launchpad-static-routes',
    apply: 'build',
    configResolved(config) { outDir = config.build.outDir; },
    async closeBundle() {
      const shell = await readFile(path.join(outDir, 'index.html'), 'utf8');
      const routes = ['getting-started', 'reference', 'saved', ...kits.map(kit => `kits/${kit.slug}`)];
      if (new Set(routes).size !== routes.length) throw new Error('Duplicate static route');
      for (const route of routes) {
        if (!/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(route)) throw new Error(`Invalid static route: ${route}`);
        const directory = path.join(outDir, route);
        await mkdir(directory, { recursive: true });
        await writeFile(path.join(directory, 'index.html'), shell);
      }
      // Pages serves this with HTTP 404 while retaining the requested URL.
      await writeFile(path.join(outDir, '404.html'), shell);
      await writeFile(path.join(outDir, '.nojekyll'), '');
    },
  };
}
