import 'server-only'
import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'

export const getPayloadClient = cache(async () => getPayload({ config }))

export const getConfiguracoes = cache(async () => {
  const payload = await getPayloadClient()
  return payload.findGlobal({ slug: 'configuracoes', depth: 1 })
})
