import type { GlobalConfig } from 'payload'
import { authenticated } from '../access'
import { revalidateGlobal } from '../hooks/revalidate'

export const Home: GlobalConfig = {
  slug: 'home',
  typescript: { interface: 'PaginaInicial' },
  label: 'Página inicial',
  admin: { group: 'Páginas fixas' },
  access: { read: () => true, update: authenticated },
  hooks: { afterChange: [revalidateGlobal] },
  fields: [
    {
      name: 'destaque',
      label: 'Competição em destaque',
      type: 'relationship',
      relationTo: 'competicoes',
      admin: {
        description:
          'Opcional. Sem escolha aqui, a home mostra a competição marcada como destaque ou a próxima competição estadual.',
      },
    },
    { name: 'textoDestaque', label: 'Texto do destaque', type: 'textarea' },
    { name: 'fotoDestaque', label: 'Foto do destaque', type: 'upload', relationTo: 'media' },
    {
      name: 'chamadaFiliacao',
      label: 'Chamada de filiação',
      type: 'group',
      fields: [
        {
          name: 'titulo',
          type: 'text',
          defaultValue: 'Faça parte do levantamento de pesos maranhense',
        },
        {
          name: 'texto',
          type: 'textarea',
          defaultValue: 'Escolha seu perfil, veja os documentos necessários e comece sua filiação.',
        },
      ],
    },
  ],
}
