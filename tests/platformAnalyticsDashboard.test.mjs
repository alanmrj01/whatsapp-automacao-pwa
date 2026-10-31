import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('platform tracking dashboard is protected and linked from admin', () => {
  const router = read('src/app/router.tsx')
  const admin = read('src/features/auth/AdminPage.tsx')

  assert.match(router,/ProtectedRoute platform/)
  assert.match(router,/\/admin\/indicadores/)
  assert.match(router,/TrackingDashboardPage/)
  assert.match(admin,/navigate\('\/admin\/indicadores'\)/)
  assert.match(admin,/Indicadores/)
})

test('tracking dashboard fetches admin analytics and keeps unavailable metrics explicit', () => {
  const api = read('src/features/auth/platformAnalytics.ts')
  const page = read('src/features/auth/TrackingDashboardPage.tsx')

  assert.match(api,/\/admin\/analytics\/summary\?days=/)
  assert.match(page,/Aguardando Meta Ads/)
  assert.match(page,/Em estruturação/)
  assert.match(page,/Sem números estimados/)
  assert.match(page,/Ativação operacional = conexão do WhatsApp concluída/)
  assert.match(page,/Funil de Conversão/)
  assert.match(page,/Assinaturas por posicionamento/)
})

test('tracking dashboard displays acronym meanings instead of ambiguous KPI labels', () => {
  const page = read('src/features/auth/TrackingDashboardPage.tsx')

  for (const meaning of [
    'Monthly Recurring Revenue / receita recorrente mensal',
    'Customer Acquisition Cost / custo de aquisição de cliente',
    'Return on Ad Spend / retorno sobre investimento em anúncios',
    'Return on Investment / retorno sobre investimento',
    'Click Through Rate / taxa de cliques',
    'Cost Per Click / custo por clique',
    'Cost Per Mille / custo por mil impressões',
    'Lifetime Value / valor do cliente ao longo do tempo',
    'Landing Page View / visualização da página',
  ]) {
    assert.ok(page.includes(meaning), meaning)
  }
})

test('tracking dashboard uses lightweight local charts without a chart dependency', () => {
  const page = read('src/features/auth/TrackingDashboardPage.tsx')
  const packageJson = read('package.json')

  assert.match(page,/conic-gradient/)
  assert.match(page,/<svg/)
  assert.match(page,/<polyline/)
  assert.doesNotMatch(packageJson,/(recharts|chart\.js|highcharts|apexcharts)/)
})
