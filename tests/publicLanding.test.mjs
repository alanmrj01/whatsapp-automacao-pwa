import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('root is a public journey with the expected signup and login routes', () => {
  const router = read('src/app/router.tsx')
  const landing = read('src/features/public/PublicLandingPage.tsx')

  assert.match(router, /path="\/" element={<PublicLandingPage \/>}/)
  assert.doesNotMatch(router, /path="\/" element={<Navigate to="\/app"/)
  assert.match(landing, /to="\/criar-conta"[\s\S]*Criar conta grátis/)
  assert.match(landing, /to="\/login"[\s\S]*Entrar/)
  assert.match(landing, /Atender pelo WhatsApp não é o problema\./)
  assert.match(landing, /Conheça a ALOVIA antes de decidir\./)
})

test('landing renders without private endpoint or query dependencies', () => {
  const landing = read('src/features/public/PublicLandingPage.tsx')

  assert.doesNotMatch(landing, /from ['"].*(?:lib\/api|httpClient)/)
  assert.doesNotMatch(landing, /\b(?:fetch|useQuery|useMutation)\s*\(/)
  assert.doesNotMatch(landing, /['"`]\/(?:api|internal)\//)
  assert.match(landing, /auth\.state === 'authenticated' && auth\.user/)
  assert.match(landing, /homeFor\(auth\.user\)/)
})

test('app and admin areas remain protected', () => {
  const router = read('src/app/router.tsx')

  assert.match(router, /<Route element={<ProtectedRoute platform \/>}>[\s\S]*path="\/admin"/)
  assert.match(router, /<Route element={<ProtectedRoute \/>}>[\s\S]*path="\/app"/)
  assert.match(router, /path="\/login" element={<LoginPage \/>}/)
  assert.match(router, /path="\/criar-conta" element={<SignupPage \/>}/)
})

test('public page keeps semantic landmarks and accessible controls', () => {
  const landing = read('src/features/public/PublicLandingPage.tsx')
  const styles = read('src/styles/public-landing.css')

  assert.match(landing, /<header className="public-header">/)
  assert.match(landing, /<nav .*aria-label="Acesso à plataforma">/)
  assert.match(landing, /<main id="conteudo-principal">/)
  assert.match(landing, /<h1 id="public-hero-title">/)
  assert.match(landing, /<footer className="public-footer">/)
  assert.match(styles, /min-height:\s*44px/)
  assert.match(styles, /env\(safe-area-inset-top\)/)
  assert.match(styles, /overflow-x:\s*clip/)
})

test('service worker serves the public journey as shell and never caches private responses', () => {
  const config = read('vite.config.ts')

  assert.match(config, /navigateFallbackAllowlist:.*\^\\\/\$.*criar-conta/s)
  assert.match(config, /navigateFallbackDenylist:.*api.*auth.*internal/)
  assert.match(config, /runtimeCaching:\s*\[\]/)
})
