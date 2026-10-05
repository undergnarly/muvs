import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), {
    name: 'dubplates-noindex-document',
    enforce: 'post',
    generateBundle(_, bundle) {
      const document = bundle['index.html'];
      if (document) document.source = String(document.source).replace(
        /<link\b(?=[^>]*rel="stylesheet")(?=[^>]*href="\/assets\/)[^>]*>/g,
        (link) => link.replace('rel="stylesheet"', 'rel="preload" as="style"').replace('>', ' data-nonblocking-style>'),
      );
      if (document) this.emitFile({
        type: 'asset',
        fileName: 'dubplates.html',
        source: String(document.source).replace('<head>', '<head>\n  <meta name="robots" content="noindex, nofollow, noarchive" />\n  <meta name="referrer" content="no-referrer" />'),
      });
    },
  }],
  optimizeDeps: {
    include: ['@appletosolutions/reactbits'],
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3001',
      '/uploads': 'http://127.0.0.1:3001'
    }
  }
})
