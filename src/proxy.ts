import { NextResponse, type NextRequest } from 'next/server'

/**
 * Fecha os endpoints de autenticação que o Payload cria sozinho para a coleção
 * `atletas` (`/api/atletas/login`, `/me`, `/forgot-password`…).
 *
 * Por quê: essas rotas gravam o cookie compartilhado `payload-token` e abrem
 * caminhos de login/recuperação que não passam pelas nossas regras (rate limit,
 * consentimento, mensagens sem enumeração). A interface usa server actions, que
 * chamam a API local — não precisa de nenhuma delas.
 *
 * O CRUD (`GET/PATCH /api/atletas/:id`) continua de pé: o painel usa para listar
 * e editar contas, e as regras de `access` cuidam de quem pode o quê.
 */
const ROTAS_DE_AUTH = new Set([
  'login',
  'logout',
  'me',
  'refresh-token',
  'forgot-password',
  'reset-password',
  'unlock',
  'init',
  'first-register',
  'verify',
])

export function proxy(request: NextRequest) {
  const partes = request.nextUrl.pathname.split('/').filter(Boolean)
  // /api/atletas/<rota>/...
  const rota = partes[2]

  if (rota && ROTAS_DE_AUTH.has(rota)) {
    return NextResponse.json({ errors: [{ message: 'Not found' }] }, { status: 404 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/atletas/:path*'],
}
