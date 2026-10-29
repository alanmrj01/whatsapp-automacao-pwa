import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('root is the approved refrigeration landing journey', () => {
  const router = read('src/app/router.tsx')
  const landing = read('src/features/public/PublicLandingPage.tsx')

  assert.match(router, /path="\/" element={<PublicLandingPage \/>}/)
  assert.doesNotMatch(router, /path="\/" element={<Navigate to="\/app"/)
  assert.match(landing, /Feito para Refrigeristas/)
  assert.match(landing, /Enquanto você está no serviço, outro cliente pode estar esperando no WhatsApp/)
  assert.match(landing, /Enquanto você cuida do serviço, a Alovia responde, coleta os dados e encaminha o agendamento/)
  assert.match(landing, /Como a Alovia atende enquanto você está no serviço/)
  assert.match(landing, /Conheça na prática como seus clientes serão atendidos/)
  assert.match(landing, /Conheça a Alovia grátis/)
  assert.match(landing, /Criar conta grátis/)
  assert.match(landing, /Até 600 mensagens de serviço por mês/)
  assert.match(landing, /Até 1\.000 mensagens por mês no total/)
  assert.match(landing, /Até 300 mensagens de utilidade/)
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
  assert.match(tracking, /event_id/)
  assert.match(tracking, /event_time_ms/)
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
  assert.match(tracker, /route_group/)
  assert.match(tracker, /target_path/)
  assert.match(tracker, /funnel_stage/)
  assert.match(tracker, /demoRoute = demo && location\.pathname\.startsWith\('\/app'\)/)
  assert.match(tracker, /path: location\.pathname/)
  assert.match(read('src/lib/tracking.ts'), /path: context\.path \?\? window\.location\.pathname/)
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
  assert.match(landing, /player\.vimeo\.com\/video\/1240828681/)
  assert.match(styles, /aspect-ratio:\s*9\s*\/\s*16/)
  assert.match(styles, /width:\s*min\(100%,\s*430px\)/)
  assert.match(landing, /landing_vsl_play_intent/)
  assert.match(landing, /postMessage\(\{ method: 'play' \}/)
  assert.match(landing, /technician-hvac\.webp/)
  assert.match(landing, /Carlos Mendes/)
  assert.match(landing, /Padaria Pão Quente/)
  assert.match(landing, /Rafael Lima/)
  assert.match(landing, /Modo demonstração/)
  assert.match(landing, /Voltar ao calendário/)
  assert.match(landing, /O cliente quer um horário mesmo quando você está com a mão no serviço/)
  assert.match(landing, /Configurações/)
  assert.match(landing, /<Send \/>/)
  assert.ok(landing.indexOf('public-hero__video') < landing.indexOf('public-static-composition'))
  assert.doesNotMatch(landing, /function TechnicianArt/)
  assert.match(styles, /min-height: 48px/)
  assert.match(styles, /\.landing-composer b svg/)
  assert.match(styles, /\.landing-phone\s*\{[\s\S]*bottom: 0;/)
  assert.match(styles, /@media \(min-width:\s*760px\)/)
})

test('service worker serves the public journey as shell and never caches private responses', () => {
  const config = read('vite.config.ts')

  assert.match(config, /navigateFallbackAllowlist:.*\^\\\/\$.*criar-conta/s)
  assert.match(config, /navigateFallbackDenylist:.*api.*auth.*internal/)
  assert.match(config, /runtimeCaching:\s*\[\]/)
})


test('signup hydrates the authenticated session and enters the demo without a second login', () => {
  const signup = read('src/features/auth/SignupPage.tsx')
  const provider = read('src/features/auth/AuthProvider.tsx')
  const context = read('src/features/auth/context.ts')
  assert.match(provider, /setState\('authenticated'\)/)
  assert.match(provider, /return me/)
  assert.match(context, /Promise<SessionUser>/)
  assert.match(signup, /const createdUser = await auth\.signup/)
  assert.match(signup, /navigate\(homeFor\(createdUser\), \{replace:true\}\)/)
  assert.match(signup, /signup_completed/)
  assert.match(signup, /businessId:createdUser\.active_business_id/)
  assert.match(signup, /userId:createdUser\.id/)
})
