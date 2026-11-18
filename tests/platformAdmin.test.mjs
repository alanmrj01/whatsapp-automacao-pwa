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
  assert.match(page,/commercialAccessText\(business\)/)
  assert.match(page,/commercialAccessTitle\(business\)/)
  assert.match(page,/!business\.commercial_access_active&&<button/)
  assert.match(page,/business\.owners\.join/)
})


test('admin directory supports card and list views with direct WhatsApp contact', () => {
  const page = read('src/features/auth/AdminPage.tsx')
  const styles = read('src/features/auth/AdminPage.css')

  assert.match(page,/viewMode/)
  assert.ok(page.includes('Cards'))
  assert.ok(page.includes('Lista'))
  for (const column of ['Empresa','E-mail','WhatsApp','Atividade','Plano','Status plano','Ações']) {
    assert.ok(page.includes(column), column)
  }
  assert.match(page,/business\.contact_whatsapp/)
  assert.match(page,/https:\/\/wa\.me\//)
  assert.match(page,/window\.open\(\`\/admin\/empresas\/\$\{business\.id\}/)
  assert.match(styles,/\.platform-admin__table-wrap/)
  assert.match(styles,/\.platform-admin__view-toggle/)
})

test('admin business detail route consolidates account billing WhatsApp and acquisition data', () => {
  const baseApi = read('src/features/auth/platformAdmin.ts')
  const api = read('src/features/auth/platformAdminDetail.ts')
  const page = read('src/features/auth/AdminBusinessDetailPage.tsx')
  const router = read('src/app/router.tsx')

  assert.match(api,/getPlatformBusiness/)
  assert.match(api,/\/admin\/businesses\/\$\{id\}/)
  assert.match(api,/acquisition_ad_id/)
  assert.match(baseApi,/commercial_payment_method/)
  assert.match(baseApi,/contact_whatsapp/)
  assert.match(router,/\/admin\/empresas\/:businessId/)
  assert.match(page,/Conta e responsável/)
  assert.match(page,/Pagamento e cobrança/)
  assert.match(page,/WhatsApp \/ Meta/)
  assert.match(page,/Aquisição/)
  assert.match(page,/Jornada no funil/)
  assert.match(page,/Anúncio \/ criativo/)
  assert.match(page,/Campaign ID/)
  assert.match(page,/Adset ID/)
  assert.match(page,/Ad ID/)
  assert.match(page,/Liberar funcionalidades/)
  assert.match(page,/Desativar empresa/)
})
