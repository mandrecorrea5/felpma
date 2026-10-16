import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
} from 'payload'

/**
 * Invalida o cache das páginas públicas quando algo muda no painel.
 * Fora do Next (ex.: script de seed) o revalidatePath não existe — por isso o try/catch.
 */
const revalidateAll = async () => {
  try {
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/', 'layout')
  } catch {
    // executando fora do servidor Next.js — nada a fazer
  }
}

export const revalidateCollection: CollectionAfterChangeHook = async ({ doc }) => {
  await revalidateAll()
  return doc
}

export const revalidateCollectionDelete: CollectionAfterDeleteHook = async ({ doc }) => {
  await revalidateAll()
  return doc
}

export const revalidateGlobal: GlobalAfterChangeHook = async ({ doc }) => {
  await revalidateAll()
  return doc
}

export const revalidateHooks = {
  afterChange: [revalidateCollection],
  afterDelete: [revalidateCollectionDelete],
}
