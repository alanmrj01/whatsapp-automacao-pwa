import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { createApiClient } from '../src/lib/httpClient.ts'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const response = (status, body = {}) => new Response(status === 204 ? null : JSON.stringify(body), {status})

test('public signup sends Idempotency-Key and keeps the bearer only in memory', async () => {
  const calls = []
  const api = createApiClient('https://api.example.test', async (url, options) => {
    calls.push({url, options})
    if (url.endsWith('/auth/signup')) return response(201, {access_token:'signup-token'})
    return response(200, {ok:true})
  })

  await api.signup('João Refrigeração', 'owner@example.test', 'uma-senha-segura-123', '11111111-1111-4111-8111-111111111111')
  assert.deepEqual(await api.request('/me'), {ok:true})

  assert.equal(calls[0].url, 'https://api.example.test/api/v1/auth/signup')
  assert.equal(calls[0].options.headers['Idempotency-Key'], '11111111-1111-4111-8111-111111111111')
  assert.equal(calls[0].options.headers.Authorization, undefined)
  assert.equal(calls[1].options.headers.Authorization, 'Bearer signup-token')
  assert.equal(calls[0].options.credentials, 'include')
  assert.equal(calls[0].options.cache, 'no-store')
})

test('a transient signup retry can reuse exactly the same idempotency key', async () => {
  const keys = []
  let attempt = 0
  const api = createApiClient('', async (url, options) => {
    if (!url.endsWith('/auth/signup')) return response(200, {ok:true})
    keys.push(options.headers['Idempotency-Key'])
    attempt++
    return attempt === 1 ? response(503) : response(201, {access_token:'signup-token'})
  })
  const key = '22222222-2222-4222-8222-222222222222'
  await assert.rejects(api.signup('Empresa Teste', 'owner@example.test', 'uma-senha-segura-123', key), {status:503})
  await api.signup('Empresa Teste', 'owner@example.test', 'uma-senha-segura-123', key)
  assert.deepEqual(keys, [key, key])
})

test('auth foundation exposes free/paid access, signup and explicit reconnect UX', () => {
  const types = read('src/features/auth/types.ts')
  const context = read('src/features/auth/context.ts')
  const signup = read('src/features/auth/SignupPage.tsx')
  const login = read('src/features/auth/LoginPage.tsx')
  const recovery = read('src/features/auth/SessionRecovery.tsx')
  const protectedRoute = read('src/features/auth/ProtectedRoute.tsx')
  const router = read('src/app/router.tsx')
  const connection = read('src/features/whatsapp/useConnection.ts')

  assert.match(types, /AccessMode = 'free' \| 'paid'/)
  assert.match(types, /access_mode: AccessMode/)
  assert.match(context, /signup:/)
  assert.match(context, /reconnect:/)
  assert.match(router, /path="\/criar-conta"/)
  assert.match(login, /Primeira vez por aqui\?/)
  assert.match(login, /Criar conta grátis/)
  assert.match(signup, /crypto\.randomUUID\(\)/)
  assert.match(signup, /Idempotency|idempotencyKey/)
  assert.match(recovery, /Vamos retomar sua sessão/)
  assert.match(recovery, />Reconectar</)
  assert.match(recovery, /Sair da conta/)
  assert.match(protectedRoute, /auth\.state === 'unavailable'.*SessionRecovery/s)
  assert.match(connection, /membership\?\.access_mode === 'paid'/)
})

test('free WhatsApp navigation does not expose the real connection action', () => {
  const whatsapp = read('src/features/whatsapp/WhatsAppPage.tsx')
  const dashboard = read('src/features/dashboard/DashboardPage.tsx')
  assert.match(whatsapp, /if \(free\)/)
  assert.match(whatsapp, /conexão real do WhatsApp fica disponível nos pacotes pagos/i)
  assert.match(dashboard, /Demonstração ativa/)
})
