import type { NextConfig } from 'next'
import { BASE_PATH } from './src/lib/base-path'

const nextConfig: NextConfig = {
  // GitHub Pages solo sirve archivos estáticos: sin servidor Node, sin
  // Image Optimization API, sin rutas dinámicas sin generateStaticParams.
  // El repo se publica como GitHub Pages "de proyecto" (workflow de GitHub
  // Actions), así que en producción vive bajo /apppz/ en vez de la raíz del
  // dominio; en local (npm run dev / npm run build) no se aplica basePath.
  output: 'export',
  basePath: BASE_PATH,
  assetPrefix: BASE_PATH ? `${BASE_PATH}/` : undefined,
  images: {
    unoptimized: true,
  },
}

export default nextConfig
