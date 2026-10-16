import type { CollectionConfig } from 'payload'
import { anyone, authenticated } from '../access'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Imagem', plural: 'Imagens' },
  admin: { group: 'Arquivos', defaultColumns: ['filename', 'alt', 'updatedAt'] },
  access: { read: anyone, create: authenticated, update: authenticated, delete: authenticated },
  fields: [
    {
      name: 'alt',
      label: 'Descrição da imagem (acessibilidade)',
      type: 'text',
      required: true,
      admin: {
        description:
          'Descreva o que aparece na foto. Ex.: "Atleta no arremesso durante o Maranhense".',
      },
    },
    { name: 'credito', label: 'Crédito da foto', type: 'text' },
  ],
  upload: {
    mimeTypes: ['image/*'],
    focalPoint: true,
    imageSizes: [
      { name: 'thumb', width: 320, height: 224, position: 'centre' },
      { name: 'card', width: 720, height: 480, position: 'centre' },
      { name: 'hero', width: 1400, height: undefined, position: 'centre' },
    ],
    adminThumbnail: 'thumb',
  },
}
