import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('quiz contains five deterministic questions with three bounded answers each', () => {
  const quiz = read('src/features/public/QuizFunnelPage.tsx')

  for (const id of ['q1','q2','q3','q4','q5']) {
    assert.match(quiz, new RegExp(`id: ['"]${id}['"]`))
  }
  assert.match(quiz, /weight: 2,[\s\S]*id: 'q1'|id: 'q1',[\s\S]*weight: 2/)
  assert.match(quiz, /id: 'q5',[\s\S]*weight: 2/)
  assert.match(quiz, /for \(const tieBreaker of \['q5', 'q1'\]/)
  assert.match(quiz, /dimensionByAnswer/)
  assert.doesNotMatch(quiz, /score.*%|percentual.*perfil/i)
})

test('quiz tracks every acquisition step needed to diagnose abandonment', () => {
  const quiz = read('src/features/public/QuizFunnelPage.tsx')
  const tracking = read('src/lib/tracking.ts')
  const funnel = read('src/lib/FunnelTracker.tsx')

  for (const eventName of [
    'quiz_viewed',
    'quiz_started',
    'quiz_question_viewed',
    'quiz_answered',
    'quiz_completed',
    'quiz_result_viewed',
    'quiz_demo_started',
    'quiz_demo_progress',
    'quiz_demo_completed',
    'quiz_signup_cta_clicked',
    'quiz_whatsapp_help_clicked',
  ]) {
    assert.match(quiz, new RegExp(eventName))
  }

  assert.match(quiz, /question_id/)
  assert.match(quiz, /answer_id/)
  assert.match(quiz, /question_number/)
  assert.match(quiz, /profile_dimension/)
  assert.match(quiz, /result_profile/)
  assert.match(tracking, /'angle'/)
  assert.match(tracking, /'quiz_profile'/)
  assert.match(funnel, /if\(pathname==='\/'\) return 'quiz'/)
})

test('quiz preserves attribution and profile into signup without browser persistence', () => {
  const quiz = read('src/features/public/QuizFunnelPage.tsx')
  const tracking = read('src/lib/tracking.ts')

  assert.match(quiz, /new URLSearchParams\(search\)/)
  assert.match(quiz, /params\.set\('quiz_profile', profile\)/)
  assert.match(quiz, /to=\{signupUrl\}/)
  assert.doesNotMatch(quiz, /localStorage|sessionStorage|indexedDB/)
  assert.doesNotMatch(tracking, /localStorage|sessionStorage|indexedDB/)
})

test('quiz is mobile-first, auto-advances and keeps the final video configurable', () => {
  const quiz = read('src/features/public/QuizFunnelPage.tsx')
  const styles = read('src/styles/quiz-funnel.css')
  const netlify = read('netlify.toml')

  assert.match(quiz, /setTimeout\(\(\) => \{/)
  assert.match(quiz, /}, 320\)/)
  assert.match(quiz, /VITE_QUIZ_DEMO_VIMEO_ID/)
  assert.match(quiz, /1240828681/)
  assert.match(quiz, /player_id=alovia-vsl/)
  assert.match(quiz, /player\.vimeo\.com\/video/)
  assert.match(styles, /aspect-ratio:\s*9\s*\/\s*16/)
  assert.match(styles, /min-height:\s*68px/)
  assert.match(styles, /@media \(max-width:\s*420px\)/)
  assert.match(styles, /prefers-reduced-motion/)
  assert.match(netlify, /frame-src[^\n]*https:\/\/player\.vimeo\.com/)
})


test('approved quiz visual polish keeps the first screen clean and strengthens result actions', () => {
  const quiz = read('src/features/public/QuizFunnelPage.tsx')
  const styles = read('src/styles/quiz-funnel.css')

  assert.doesNotMatch(quiz, /Para quem vive a rotina de refrigeração/)
  assert.equal((quiz.match(/Atendimento automático pelo WhatsApp/g) ?? []).length, 2)
  assert.match(quiz, /Você precisa ver isso funcionando\. Assista ao vídeo abaixo agora/)
  assert.match(styles, /background:\s*#fff3bf/)
  assert.match(styles, /@keyframes quiz-cta-hop/)
  assert.match(styles, /animation:\s*quiz-cta-hop 2\.1s ease-in-out infinite/)
  assert.match(quiz, /function WhatsAppLogo/)
  assert.match(quiz, /quiz-whatsapp-help__icon"><WhatsAppLogo size=\{24\}/)
  assert.match(quiz, /quiz-whatsapp-cta__logo"><WhatsAppLogo size=\{20\}/)
  assert.doesNotMatch(quiz, /MessageCircle/)
})

test('development proxy never defaults to the production Netlify origin', () => {
  const vite = read('vite.config.ts')

  assert.match(vite, /ALOVIA_API_ORIGIN/)
  assert.match(vite, /http:\/\/127\.0\.0\.1:8000/)
  assert.doesNotMatch(vite, /target:\s*['"]https:\/\/alovia\.netlify\.app/)
})

test('tracking remains continuous from quiz profile through account creation and authenticated entry', () => {
  const quiz = read('src/features/public/QuizFunnelPage.tsx')
  const signup = read('src/features/auth/SignupPage.tsx')
  const funnel = read('src/lib/FunnelTracker.tsx')
  const tracking = read('src/lib/tracking.ts')

  assert.match(quiz, /params\.set\('quiz_profile', profile\)/)
  assert.match(quiz, /to=\{signupUrl\}/)
  assert.match(tracking, /'quiz_profile'/)
  assert.match(signup, /trackEvent\('signup_started'/)
  assert.match(signup, /trackEvent\('signup_submit'/)
  assert.match(signup, /crypto\.randomUUID\(\)/)
  assert.match(signup, /eventId:key/)
  assert.match(signup, /businessId:createdUser\.active_business_id/)
  assert.match(signup, /userId:createdUser\.id/)
  assert.match(funnel, /trackEvent\('signup_completed'/)
  assert.match(funnel, /businessId !== auth\.user\.active_business_id/)
  assert.match(funnel, /userId !== auth\.user\.id/)
  assert.match(funnel, /demo_page_view' : 'page_view'/)
  assert.match(tracking, /optionalAuthRequest<\{accepted:boolean\}>\('\/marketing\/events'/)
})

