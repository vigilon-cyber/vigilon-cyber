// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.vigiloncyber.com',
  output: 'server',
  adapter: vercel(),
  integrations: [
    sitemap({
      // Guided tools stay out of the sitemap until their rule sets are reviewed (see src/lib/tools/registry.ts).
      filter: (page) => !page.includes('/tools/'),
    }),
  ],
  trailingSlash: 'never',
  redirects: {
    // Existing guides and service pages link here; the service lives at the RED route.
    '/services/en-18031-compliance': '/services/red-cyber-compliance',
    '/tools': '/resources',
  },
});
