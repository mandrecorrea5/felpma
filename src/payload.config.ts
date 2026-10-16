import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { pt } from '@payloadcms/translations/languages/pt'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Documentos } from './collections/Documentos'
import { Noticias } from './collections/Noticias'
import { Competicoes } from './collections/Competicoes'
import { Convocacoes } from './collections/Convocacoes'
import { Resultados } from './collections/Resultados'
import { Recordes } from './collections/Recordes'
import { Centros } from './collections/Centros'
import { Diretoria } from './collections/Diretoria'
import { Paginas } from './collections/Paginas'
import { Mensagens } from './collections/Mensagens'
import { Configuracoes } from './globals/Configuracoes'
import { Home } from './globals/Home'
import { Filiacao } from './globals/Filiacao'
import { Federacao } from './globals/Federacao'
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || '',
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' · Painel FELPMA' },
    dateFormat: 'dd/MM/yyyy HH:mm',
  },
  i18n: {
    supportedLanguages: { pt },
    fallbackLanguage: 'pt',
  },
  collections: [
    Noticias,
    Paginas,
    Mensagens,
    Competicoes,
    Convocacoes,
    Resultados,
    Recordes,
    Centros,
    Diretoria,
    Documentos,
    Media,
    Users,
  ],
  globals: [Home, Filiacao, Federacao, Configuracoes],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || '' },
    // Em desenvolvimento o schema é sincronizado sozinho; em produção use migrations (ver README).
    push: process.env.NODE_ENV !== 'production',
    // Em produção, as migrations pendentes rodam sozinhas quando o servidor inicia.
    prodMigrations: migrations,
  }),
  sharp,
  upload: { limits: { fileSize: 20_000_000 } },
})
