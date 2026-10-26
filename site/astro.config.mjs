import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Pages are built as /page/index.html and linked with a trailing slash.
// The CloudFront function in ../infra rewrites /page/ to /page/index.html
// and redirects /page to /page/.
export default defineConfig({
  site: 'https://nicolasmoreale.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [sitemap()],
  // Code blocks use the site's own styles (see .prose pre in global.css).
  markdown: { syntaxHighlight: false },
});
