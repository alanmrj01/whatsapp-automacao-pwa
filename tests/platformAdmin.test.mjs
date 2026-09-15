import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'
import {withBusinessAccess} from '../src/features/auth/adminAccessState.ts'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('admin access update is tenant-scoped and can be rolled back locally', () => {
  const initial = [
    {id:'business-a',access_mode:'free',name:'A'},
    {id:'business-b',access_mode:'paid',name:'B'},
  ]
  const optimistic = withBusinessAccess(initial,'business-a','paid')
  assert.equal(optimistic[0].access_mode,'paid')
  assert.equal(optimistic[1],initial[1])
  assert.equal(initial[0].access_mode,'free')
  const rolledBack = withBusinessAccess(optimistic,'business-a','free')
  assert.equal(rolledBack[0].access_mode,'free')
})

test('admin API sends the strict entitlement payload to the public admin route', () => {
  const api = read('src/features/auth/platformAdmin.ts')
  assert.match(api,/\/admin\/businesses\/\$\{id\}\/access/)
  assert.match(api,/method: 'PATCH'/)
  assert.match(api,/JSON\.stringify\(\{access_mode\}\)/)
})

test('admin distinguishes load failure, empty success and access confirmation', () => {
  const page = read('src/features/auth/AdminPage.tsx')
  assert.match(page,/loadError && businesses\.length === 0/)
  assert.match(page,/Não foi possível carregar as empresas/)
  assert.match(page,/Tentar novamente/)
  assert.match(page,/Nenhuma empresa cadastrada/)
  assert.match(page,/Liberar funcionalidades pagas para esta empresa sem criar cobrança ou assinatura\?/)
  assert.match(page,/withBusinessAccess\(current, business\.id, next\)/)
  assert.match(page,/withBusinessAccess\(current, business\.id, previous\)/)
  assert.match(page,/Liberação administrativa concluída/)
  assert.match(page,/Acesso liberado/)
  assert.match(page,/Plano comercial: não registrado/)
  assert.match(page,/business\.owners\.join/)
})
