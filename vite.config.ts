import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';
import {documentAIPlugin} from './document-ai-server';

const ANNOTATIONS_FILE = path.resolve(__dirname, '.dev-annotations.json');

function devAnnotationsPlugin(): Plugin {
  return {
    name: 'lms-dev-annotations',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__dev-annotations', (req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (req.method === 'GET') {
          try {
            const raw = fs.existsSync(ANNOTATIONS_FILE)
              ? fs.readFileSync(ANNOTATIONS_FILE, 'utf8')
              : '[]';
            res.statusCode = 200;
            res.end(raw);
          } catch {
            res.statusCode = 200;
            res.end('[]');
          }
          return;
        }
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body || '[]');
              fs.writeFileSync(ANNOTATIONS_FILE, JSON.stringify(parsed, null, 2), 'utf8');
              res.statusCode = 200;
              res.end(JSON.stringify({ok: true, count: Array.isArray(parsed) ? parsed.length : 0}));
            } catch (err) {
              res.statusCode = 400;
              res.end(JSON.stringify({ok: false, error: String(err)}));
            }
          });
          return;
        }
        res.statusCode = 405;
        res.end(JSON.stringify({ok: false}));
      });
    },
  };
}

export default defineConfig(({mode}) => {
  const documentAIEnv = {...loadEnv(mode, process.cwd(), 'GEMINI_'), ...Object.fromEntries(Object.entries(process.env).filter(([key])=>key.startsWith('GEMINI_')))} as Record<string,string>;
  const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
  const repoName = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[1] : '';
  const basePath = isGithubActions ? `/${repoName}/` : './';

  return {
    base: basePath,
    plugins: [react(), tailwindcss(), devAnnotationsPlugin(), documentAIPlugin(documentAIEnv)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {app:path.resolve(__dirname,'index.html'),oauth:path.resolve(__dirname,'oauth-callback.html')},
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
      watch:
        process.env.DISABLE_HMR === 'true'
          ? null
          : {
              ignored: ['**/.dev-annotations.json'],
            },
    },
  };
});
