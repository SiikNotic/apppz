import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    ignores: ['.next/**', 'node_modules/**'],
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
