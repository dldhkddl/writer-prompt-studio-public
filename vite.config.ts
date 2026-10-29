import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { createCodexApiHandler } from './server/codex-api.mjs';
import { createCodexRunner } from './server/codex-runner.mjs';
import { createOpenAIImageGenerator } from './server/openai-image.mjs';
import { resolveOpenAIImageApiKey } from './server/image-config.mjs';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  const apiKey = resolveOpenAIImageApiKey({ mode, projectRoot, processEnv: process.env, loadEnv });
  const codexApi = createCodexApiHandler(createCodexRunner({ projectRoot }), { imageGenerator: createOpenAIImageGenerator({ apiKey }) });
  const codexLocalPlugin = {
    name: 'codex-local-api',
    configureServer(server: { middlewares: { use: (handler: typeof codexApi) => void } }) { server.middlewares.use(codexApi); },
    configurePreviewServer(server: { middlewares: { use: (handler: typeof codexApi) => void } }) { server.middlewares.use(codexApi); },
  };
  return {
    plugins: [react(), codexLocalPlugin],
    server: { host: '127.0.0.1' },
    preview: { host: '127.0.0.1' },
  };
});
