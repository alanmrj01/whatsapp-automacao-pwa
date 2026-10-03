  assert.match(router,/path="\/app\/checkout" element=\{<CheckoutPage \/>\}/)
})

test('compact upgrade prompt and account routes remain explicit', () => {
  const prompt = read('src/features/access/UpgradePrompt.tsx')
  const router = read('src/app/router.tsx')
  const dashboard = read('src/features/dashboard/DashboardPage.tsx')

  assert.match(prompt,/Disponível com assinatura/)
  assert.match(prompt,/Ver planos/)
  assert.doesNotMatch(prompt,/Sua conta gratuita continua sem cobrança/)
  assert.match(router,/mais\/plano/)
  assert.match(router,/mais\/usuario/)
  assert.match(router,/mais\/seguranca/)
  assert.match(router,/mais\/privacidade/)
  assert.match(dashboard,/<h1>Dashboard<\/h1>/)
  assert.match(dashboard,/dashboard-business-name/)
})

test('checkout confirmation does not auto-reload or bounce through auth loading', () => {
  const checkoutReturn = read('src/features/billing/CheckoutReturnPage.tsx')
  const authProvider = read('src/features/auth/AuthProvider.tsx')
  const vite = read('vite.config.ts')
  const main = read('src/main.tsx')

  assert.match(checkoutReturn,/syncSession/)
  assert.doesNotMatch(checkoutReturn,/await reconnect\(\)/)
  assert.match(authProvider,/const syncSession = useCallback/)
  assert.match(authProvider,/api\.request<SessionUser>\('\/me'\)/)
  const syncBlock = authProvider.match(/const syncSession = useCallback\([\s\S]*?\n  \}, \[\]\)/)?.[0] ?? ''
  assert.ok(syncBlock)
  assert.doesNotMatch(syncBlock,/setState\('loading'\)/)
  assert.match(vite,/registerType: 'prompt'/)
  assert.doesNotMatch(vite,/registerType: 'autoUpdate'/)
  assert.match(main,/onNeedRefresh: \(\) => undefined/)
})