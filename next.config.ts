import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  // Gera um servidor enxuto em .next/standalone, usado pelo Dockerfile.
  output: 'standalone',
  /**
   * Cabeçalhos de segurança que não dependem do proxy.
   *
   * `frame-ancestors 'none'` + `X-Frame-Options: DENY` fecham clickjacking no
   * painel (antes o `/admin` podia ser enquadrado por qualquer site). Não
   * atrapalha o iframe do OpenStreetMap: estes cabeçalhos dizem quem pode
   * enquadrar *este* site, não o que este site pode enquadrar.
   *
   * A CSP aqui é mínima de propósito. Uma CSP com `script-src` quebraria o
   * painel do Payload (estilo/script inline); o caminho para endurecer é
   * escrever a política completa com nonce e subir em Report-Only primeiro.
   * O que está abaixo não restringe script/estilo, então é seguro no painel.
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none'; base-uri 'self'; object-src 'self'",
          },
        ],
      },
    ]
  },
  experimental: {
    serverActions: {
      // Inscrição com arquivo vai por Server Action (multipart). O padrão do
      // Next é 1 MB — abaixo do limite de 2 MB por arquivo aceito no formulário.
      // 12 MB cobre até 5 anexos de 2 MB + campos de texto e overhead do multipart.
      bodySizeLimit: '12mb',
    },
  },
  // O PDFKit lê os arquivos .afm das fontes embutidas em tempo de execução.
  // Sem externalizar, o bundler não copia esses arquivos para o standalone.
  serverExternalPackages: ['pdfkit'],
  outputFileTracingIncludes: {
    '/*': ['./node_modules/pdfkit/js/data/**/*'],
  },
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
