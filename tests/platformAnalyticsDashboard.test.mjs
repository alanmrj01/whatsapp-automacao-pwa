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

test('tracking dashboard mirrors the complete MVP funnel and keeps sources explicit', () => {
  const api = read('src/features/auth/platformAnalytics.ts')
  const page = read('src/features/auth/TrackingDashboardPage.tsx')

  assert.match(api,/\/admin\/analytics\/summary\?days=/)
  assert.match(api,/ad_performance/)
  assert.match(api,/conversions_by_angle/)
  assert.match(api,/conversions_by_quiz_profile/)
  assert.match(api,/quiz_questions/)
  assert.match(api,/onboarding_issues/)
  assert.match(page,/Funil comercial do MVP/)
  assert.match(page,/Desempenho por anúncio/)
  assert.match(page,/summary\.conversions_by_angle/)
  assert.match(page,/summary\.conversions_by_quiz_profile/)
  assert.match(page,/Respostas do quiz e qualidade do lead/)
  assert.match(page,/Gargalos de ativação/)
  assert.match(page,/Meta Ads/)
  assert.match(page,/Fonte de verdade/)
  assert.match(page,/Receita líquida = recebimentos − reembolsos confirmados/)
})

test('dashboard prioritizes the selected launch KPIs and deep conversion diagnostics', () => {
  const page = read('src/features/auth/TrackingDashboardPage.tsx')

  for (const key of [
    'ad_spend',
    'cac',
    'roas',
    'net_revenue',
    'subscriptions',
    'accounts',
    'activations',
    'mrr',
    'impressions',
    'link_clicks',
    'ctr',
    'cpc',
    'cpm',
    'quiz_completion_rate',
    'vsl_completion_rate',
    'checkout_started',
    'trial_to_paid',
    'activation_rate',
    'refunds',
  ]) {
    assert.ok(page.includes(`'${key}'`), key)
  }
})

test('tracking dashboard writes acronym meanings next to business indicators', () => {
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
  assert.match(page,/tracking-metric-label/)
})

test('tracking dashboard uses lightweight local charts without a chart dependency', () => {
  const page = read('src/features/auth/TrackingDashboardPage.tsx')
  const styles = read('src/features/auth/TrackingDashboardPage.css')
  const packageJson = read('package.json')

  assert.match(page,/conic-gradient/)
  assert.match(page,/<svg/)
  assert.match(page,/<polyline/)
  assert.match(styles,/tracking-table-wrap/)
  assert.match(styles,/tracking-quiz__grid/)
  assert.doesNotMatch(packageJson,/(recharts|chart\.js|highcharts|apexcharts)/)
})
