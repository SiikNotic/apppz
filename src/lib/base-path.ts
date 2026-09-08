// Debe reflejar el mismo basePath condicional configurado en next.config.ts.
// Se usa para prefijar manualmente rutas de assets que Next.js no reescribe
// automáticamente (por ejemplo, metadata.icons).
export const BASE_PATH = process.env.GITHUB_ACTIONS === 'true' ? '/apppz' : ''
