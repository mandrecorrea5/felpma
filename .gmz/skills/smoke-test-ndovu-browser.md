---
name: smoke-test-ndovu-browser
description: Valida de ponta a ponta a ingestão do Ndovu SDK no browser sem ter o Ndovu de pé: stub collector + Chrome headless guiado por CDP puro (zero dependência).
created: 2026-10-17T02:37:31.222Z
---

# Smoke test da ingestão do Ndovu (browser SDK) sem o Ndovu instalado

Use quando: você integrou o `ndovu-browser.js` num app Next/React e precisa PROVAR
que os eventos saem do navegador e chegam à API — sem subir o stack do Ndovu e sem
instalar Playwright/Puppeteer.

## Por que não `chrome --headless --dump-dom`
`--dump-dom` encerra a aba assim que imprime o DOM. O flush do SDK (a cada 5s, ou em
`pagehide`) nunca completa e você conclui falsamente que "não tem evento". Precisa de
uma aba que fique viva → CDP.

## Passo 1 — stub collector (porta do Ndovu)
`/tmp/ndovu-stub.mjs` — **o CORS é obrigatório**: `X-Api-Key` é header não-simple,
então todo POST vem precedido de um preflight `OPTIONS`. Sem responder 204 com
`Access-Control-Allow-Headers`, o fetch falha, o SDK empurra o lote de volta pra fila
e você não vê erro nenhum em lugar nenhum.

```js
import { createServer } from 'node:http'
import { appendFileSync } from 'node:fs'
const OUT = '/tmp/ndovu-eventos.ndjson'
createServer((req, res) => {
  const cors = {
    'Access-Control-Allow-Origin': req.headers.origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key, traceparent',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  }
  if (req.method === 'OPTIONS') return res.writeHead(204, cors).end()
  let raw = ''
  req.on('data', (c) => (raw += c))
  req.on('end', () => {
    let corpo = {}
    try { corpo = JSON.parse(raw || '{}') } catch {}
    const ev = Array.isArray(corpo.events) ? corpo.events : []
    appendFileSync(OUT, JSON.stringify({ rota: req.url, qtd: ev.length, eventos: ev }) + '\n')
    res.writeHead(202, { 'Content-Type': 'application/json', ...cors })
    res.end(JSON.stringify({ accepted: ev.length }))
  })
}).listen(18081, '127.0.0.1')
```

## Passo 2 — Chrome com remote debugging
```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --no-sandbox \
  --remote-debugging-port=9333 \
  --user-data-dir=/tmp/chrome-profile --no-first-run about:blank &
```

## Passo 3 — driver CDP sem dependência
Node ≥22 tem `fetch` e `WebSocket` globais: dá para falar CDP cru, sem SDK.

```js
// cdp.mjs — passos JSON: [{navega, espera, js, rótulo, esperaPasso}]
import { readFileSync } from 'node:fs'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const alvo = await (await fetch('http://127.0.0.1:9333/json/new?about:blank', { method: 'PUT' })).json()
const ws = new WebSocket(alvo.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result ?? m); pend.delete(m.id) }
})
const send = (method, params = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method, params })) })
const avalie = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  return r.exceptionDetails ? `ERRO: ${r.exceptionDetails.text}` : r.result?.value
}
await send('Runtime.enable'); await send('Page.enable')
for (const p of JSON.parse(readFileSync(process.argv[2], 'utf8'))) {
  if (p.navega) { await send('Page.navigate', { url: p.navega }); await sleep(p.espera ?? 3500) }
  if (p.js) await avalie(p.js)
  if (p.esperaPasso) await sleep(p.esperaPasso)
}
await avalie('window.__minha_bula__?.flush(); 1'); await sleep(1500)
process.exit(0)
```

O `.click()` via `Runtime.evaluate` dispara evento real que sobe pelo document — é
assim que se testa listener delegado/`capture`, sem precisar de seletor estável.

## O que cada item deste testou
| Quer provar | Passo |
|---|---|
| pageview por rota + nome normalizado | `navega` em duas rotas e ler os `page_view` |
| clique em link (delegação) | `document.querySelector('a[href="/x"]').click()` |
| navegação SPA com origem→destino e duração | dois cliques SPA em sequência, ler `deRota`/`duracaoNavegacaoMs` |
| erro de validação de server action | submit com campo vazio → `error` com `code: VALIDACAO` + `http_request` da action |
| fronteira de erro (`error.tsx`) | rota temporária cujo `page.tsx` só faz `throw` → ler o `digest` no evento |
| 404 | rota dinâmica inexistente (`/noticias/nao-existe`), que cai no `notFound()` |
| handler global | `Promise.reject(new Error('x'))` no console |
| PII não vazou | grep no NDJSON: nenhum valor digitado no form pode aparecer |

## Pegadinhas
- **Rode a suíte com o dev server já quente e sem mexer em arquivo no meio.** Apagar/criar
  arquivo durante o run provoca HMR e chuva de `console_error` + "module factory is not
  available", que parece falha da integração e é do Turbopack.
- Dev + StrictMode montam effects duas vezes: se seu `page_view` duplicar, o culpado é esse.
- Server/dev regenera `src/payload-types.ts` e `importMap.js` com formatação própria →
  `git checkout --` neles antes de commitar.

## Como ler o resultado
```bash
node -e 'const fs=require("fs");for(const l of fs.readFileSync("/tmp/ndovu-eventos.ndjson","utf8").trim().split("\n"))
  for(const e of JSON.parse(l).eventos) console.log(`[${e.type}] ${e.name} s=${e.screen??"-"}`)'
```
