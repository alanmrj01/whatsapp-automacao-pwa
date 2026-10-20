import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('root is the approved refrigeration landing journey', () => {
  const router = read('src/app/router.tsx')
  const landing = read('src/features/public/PublicLandingPage.tsx')

  assert.match(router, /path="\/" element={<PublicLandingPage \/>}/)
  assert.doesNotMatch(router, /path="\/" element={<Navigate to="\/app"/)
  assert.match(landing, /Feito para Refrigeiristas/)
  assert.match(landing, /Enquanto você está no serviço, outro cliente pode estar esperando no WhatsApp/)
  assert.match(landing, /A Alovia continua o atendimento, coleta as informações do serviço e ajuda a organizar o agendamento enquanto você está trabalhando\./)
  assert.match(landing, /Como a Alovia atende enquanto você está no serviço/)
  assert.match(landing, /Conheça na prática como seus clientes serão atendidos/)
  assert.match(landing, /Experimente a Alovia grátis/)
  assert.match(landing, /Criar conta grátis/)
  assert.match(landing, /to="\/login"/)
})

test('landing tracks the commercial journey without private app API dependencies', () => {
  const landing = read('src/features/public/PublicLandingPage.tsx')
  const tracking = read('src/lib/tracking.ts')

  assert.doesNotMatch(landing, /from ['"].*(?:lib\/api|httpClient)/)
  assert.doesNotMatch(landing, /\b(?:useQuery|useMutation)\s*\(/)
  assert.match(landing, /landing_cta_click/)
  assert.match(landing, /landing_section_view/)
  assert.match(landing, /landing_scroll_depth/)
  assert.match(landing, /landing_vsl_play_intent/)
  assert.match(tracking, /utm_source/)
  assert.match(tracking, /visitor_id/)
  assert.match(tracking, /session_id/)
  assert.match(landing, /auth\.state === 'authenticated' && auth\.user/)
  assert.match(landing, /homeFor\(auth\.user\)/)
})

test('demo accounts are covered by route and interaction tracking', () => {
  const tracker = read('src/lib/FunnelTracker.tsx')
  const main = read('src/main.tsx')

  assert.match(main, /<FunnelTracker \/>/)
  assert.match(tracker, /demo_page_view/)
  assert.match(tracker, /demo_interaction/)
  assert.match(tracker, /membership\?\.access_mode === 'free'/)
})

test('app and admin areas remain protected', () => {
  const router = read('src/app/router.tsx')

  assert.match(router, /<Route element={<ProtectedRoute platform \/>}>[\s\S]*path="\/admin"/)
  assert.match(router, /<Route element={<ProtectedRoute \/>}>[\s\S]*path="\/app"/)
  assert.match(router, /path="\/login" element={<LoginPage \/>}/)
  assert.match(router, /path="\/criar-conta" element={<SignupPage \/>}/)
})

test('public page keeps semantic headings and mobile-first controls', () => {
  const landing = read('src/features/public/PublicLandingPage.tsx')
  const styles = read('src/styles/public-landing.css')

  assert.match(landing, /<header className="public-header">/)
  assert.match(landing, /<main>/)
  assert.match(landing, /<h1>/)
  assert.match(landing, /data-track-section="hero"/)
  assert.match(landing, /data-track-section="vsl"/)
  assert.match(landing, /aria-label="Assistir demonstração da Alovia"/)
  assert.match(landing, /technician-hvac\.webp/)
  assert.doesNotMatch(landing, /function TechnicianArt/)
  assert.match(styles, /min-height: 48px/)
  assert.match(styles, /@media \(min-width:\s*760px\)/)
})

test('service worker serves the public journey as shell and never caches private responses', () => {
  const config = read('vite.config.ts')

  assert.match(config, /navigateFallbackAllowlist:.*\^\\\/\$.*criar-conta/s)
  assert.match(config, /navigateFallbackDenylist:.*api.*auth.*internal/)
  assert.match(config, /runtimeCaching:\s*\[\]/)
})
