import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
  const repoName = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[1] : '';
  const basePath = isGithubActions ? `/${repoName}/` : './';

  return {
    base: basePath,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('shepherd.js')) return 'vendor-shepherd';
              if (id.includes('sortablejs')) return 'vendor-sortable';
              if (id.includes('react')) return 'vendor-react';
            }
            if (id.includes('material-icon-vectors')) {
              return 'feature-icon-vectors';
            }
            if (
              id.includes('/src/flow-') ||
              id.includes('\\src\\flow-') ||
              id.includes('/src/modular-') ||
              id.includes('\\src\\modular-')
            ) {
              return 'feature-diagrams-and-tables';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
