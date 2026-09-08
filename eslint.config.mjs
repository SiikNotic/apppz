import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    // Deno/Edge Function: runtime, imports (npm:) y globals distintos a los
    // del resto del proyecto (Next.js/Node) — se lintea con `deno lint` si
    // hace falta, no con este config.
    ignores: ['.next/**', 'node_modules/**', 'supabase/functions/**'],
  },
  {
    rules: {
      // Fetch-in-effect + setState-in-then is the standard client-side data
      // loading pattern used throughout this app's admin/customer pages —
      // downgraded to a warning instead of adopting a data-fetching library.
      'react-hooks/set-state-in-effect': 'warn',
      // False positive on item-thumb.tsx: `Icon` is a stable reference picked
      // from a fixed, module-level list, not a component created on render.
      'react-hooks/static-components': 'warn',
    },
  },
]

export default eslintConfig
