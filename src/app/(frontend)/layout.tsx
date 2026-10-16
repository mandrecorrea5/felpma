import type { Metadata, Viewport } from 'next'
import React from 'react'
import '@fontsource/montserrat/600.css'
import '@fontsource/montserrat/700.css'
import '@fontsource/montserrat/800.css'
import '@fontsource/montserrat/900.css'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { getConfiguracoes } from '@/lib/payload'

// Páginas renderizadas a cada visita: o conteúdo do painel aparece na hora e o build
// não depende do banco de dados (necessário para o Dockerfile).
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getConfiguracoes()
  const base = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  return {
    metadataBase: new URL(base),
    title: {
      default: `${config.sigla} — ${config.nomeCompleto}`,
      template: `%s · ${config.sigla}`,
    },
    description: config.descricaoSite ?? undefined,
    openGraph: { siteName: config.sigla, locale: 'pt_BR', type: 'website' },
  }
}

export const viewport: Viewport = { themeColor: '#1C0A96' }

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const config = await getConfiguracoes()
  return (
    <html lang="pt-BR">
      <body>
        <Header config={config} />
        <main id="conteudo">{children}</main>
        <Footer config={config} />
      </body>
    </html>
  )
}
