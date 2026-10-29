export function resolveOpenAIImageApiKey({ mode, projectRoot, processEnv = process.env, loadEnv }) {
  const systemKey = typeof processEnv.OPENAI_API_KEY === 'string' ? processEnv.OPENAI_API_KEY.trim() : '';
  if (systemKey) return systemKey;
  const fileKey = loadEnv(mode, projectRoot, '').OPENAI_API_KEY;
  return typeof fileKey === 'string' ? fileKey.trim() : '';
}
