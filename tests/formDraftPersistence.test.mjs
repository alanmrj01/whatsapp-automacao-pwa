import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url),'utf8')

test('signup preserves non-secret fields and idempotency across refresh without storing passwords',()=>{
  const signup=read('src/features/auth/SignupPage.tsx')
  assert.match(signup,/SIGNUP_DRAFT_KEY/)
  assert.match(signup,/readSessionDraft<SignupDraft>/)
  assert.match(signup,/writeSessionDraft<SignupDraft>/)
  assert.match(signup,/idempotencyKey:idempotencyKey\.current/)
  assert.match(signup,/clearSessionDraft\(SIGNUP_DRAFT_KEY\)/)

  const draftEffect=signup.match(/useEffect\(\(\)=>\{\s*writeSessionDraft<SignupDraft>[\s\S]*?\},\[businessName,email,leadName,leadWhatsApp\]\)/)?.[0]??''
  assert.ok(draftEffect)
  assert.doesNotMatch(draftEffect,/password|confirmation/)
})

test('checkout preserves identification and payment step but never card credentials',()=>{
  const checkout=read('src/features/billing/CheckoutPage.tsx')
  assert.match(checkout,/type CheckoutDraft/)
  assert.match(checkout,/alovia:checkout:draft:v1:/)
  assert.match(checkout,/readSessionDraft<CheckoutDraft>/)
  assert.match(checkout,/writeSessionDraft<CheckoutDraft>/)
  assert.match(checkout,/payerDocument/)
  assert.match(checkout,/addressComplement/)
  assert.match(checkout,/openStep/)
  assert.match(checkout,/clearSessionDraft\(checkoutDraftKey\)/)

  const draftEffect=checkout.slice(
    checkout.indexOf('writeSessionDraft<CheckoutDraft>'),
    checkout.indexOf('useEffect(()=>',checkout.indexOf('writeSessionDraft<CheckoutDraft>')+1),
  )
  assert.doesNotMatch(draftEffect,/cardNumber|ccv|expiryMonth|expiryYear/)
})

test('company onboarding preserves unsaved company data and clears the draft after save',()=>{
  const onboarding=read('src/features/onboarding/OnboardingPage.tsx')
  assert.match(onboarding,/type CompanyDraft/)
  assert.match(onboarding,/alovia:onboarding:company:draft:v1:/)
  assert.match(onboarding,/readSessionDraft<CompanyDraft>/)
  assert.match(onboarding,/writeSessionDraft<CompanyDraft>/)
  assert.match(onboarding,/clearSessionDraft\(companyDraftKey\)/)
  assert.match(onboarding,/alovia:onboarding:progress:v1:/)
})

test('session draft helper is session-scoped, versioned and expires stale drafts',()=>{
  const helper=read('src/lib/sessionDraft.ts')
  assert.match(helper,/window\.sessionStorage/)
  assert.doesNotMatch(helper,/localStorage|indexedDB/)
  assert.match(helper,/expiresAt<=Date\.now\(\)/)
  assert.match(helper,/version:\s*1/)
})

test('new service worker can activate without taking over the current page mid-form',()=>{
  const vite=read('vite.config.ts')
  assert.match(vite,/registerType: 'prompt'/)
  assert.match(vite,/skipWaiting: true/)
  assert.doesNotMatch(vite,/clientsClaim:\s*true/)
})
