const REQUIRED_VARS = ['OPENAI_API_KEY'];
const OPTIONAL_VARS = [
  { name: 'PORT', default: '4000' },
  { name: 'OPENAI_MODEL', default: 'gpt-3.5-turbo' },
  { name: 'CORS_ORIGIN', default: 'http://localhost:3000' },
  { name: 'DB_PATH', default: './data/shorts.db' },
  { name: 'NODE_ENV', default: 'development' },
];

function validateEnv() {
  const missing = [];
  for (const varName of REQUIRED_VARS) {
    if (!process.env[varName] || process.env[varName] === 'sk-your-key-here') {
      missing.push(varName);
    }
  }
  for (const opt of OPTIONAL_VARS) {
    if (!process.env[opt.name]) {
      process.env[opt.name] = opt.default;
    }
  }
  if (missing.length > 0) {
    console.error(
      `[config] Missing required environment variables: ${missing.join(', ')}`
    );
    if (process.env.NODE_ENV === 'production') {
      console.error('[config] Exiting due to missing configuration.');
      process.exit(1);
    }
    console.warn('[config] Continuing in development mode without these variables.');
  }
  return missing.length === 0;
}

module.exports = { validateEnv };
