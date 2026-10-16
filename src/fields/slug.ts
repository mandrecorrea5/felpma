import type { Field, FieldHook } from 'payload'

export const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

const formatSlug =
  (fallback: string): FieldHook =>
  ({ value, data, originalDoc }) => {
    if (typeof value === 'string' && value.length > 0) return slugify(value)
    const source = data?.[fallback] ?? originalDoc?.[fallback]
    if (typeof source === 'string') return slugify(source)
    return value
  }

/** Campo de slug gerado automaticamente a partir de outro campo (ex.: título). */
export const slugField = (fieldToUse = 'titulo'): Field => ({
  name: 'slug',
  label: 'Endereço (slug)',
  type: 'text',
  index: true,
  unique: true,
  admin: {
    position: 'sidebar',
    description:
      'Gerado automaticamente a partir do título. Só altere se souber o que está fazendo.',
  },
  hooks: {
    beforeValidate: [formatSlug(fieldToUse)],
  },
})
