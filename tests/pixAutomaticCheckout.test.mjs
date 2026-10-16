import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'
import {
  copyPixPayload,
  createPixQrDataUrl,
  isTerminalCheckoutStatus,
  PIX_STATUS_POLL_MS,
} from '../src/features/billing/pixAutomatic.ts'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url),'utf8')

test('Pix Automático is the default and card is prepared only after explicit selection',()=>{
  const checkout=read('src/features/billing/CheckoutPage.tsx')
  const profileLoader=checkout.match(/const loadProfile=useCallback[\s\S]*?\},\[cycleParam,planId\]\)/)?.[0]??''

  assert.match(checkout,/useState<PaymentMethod>\('pix_automatic'\)/)
  assert.match(checkout,/value="pix_automatic" checked=\{paymentMethod==='pix_automatic'\}/)
  assert.match(checkout,/value="credit_card" checked=\{paymentMethod==='credit_card'\}/)
  assert.match(checkout,/if\(method==='pix_automatic'\)[\s\S]*return[\s\S]*prepareCardCheckout\(key\)/)
  assert.match(profileLoader,/\/billing\/checkout-profile/)
  assert.doesNotMatch(profileLoader,/\/billing\/checkouts/)
})

test('Pix creation sends only the supported identification contract with its own idempotency key',()=>{
  const checkout=read('src/features/billing/CheckoutPage.tsx')

  assert.match(checkout,/headers:\{'Idempotency-Key':key\}/)
  assert.match(checkout,/payment_method:method/)
  assert.match(checkout,/payer_name:payerNameValue/)
  assert.match(checkout,/payer_cpf_cnpj:payerDocumentValue/)
  assert.match(checkout,/const key=rotateAttempt\(method\)/)
  assert.match(checkout,/const key=rotateAttempt\(paymentMethod\)/)
  assert.match(checkout,/checkout_mode!=='pix'/)
  assert.match(checkout,/!nextCheckout\.pix_payload\?\.trim\(\)/)
})

test('QR and Pix Copia e Cola stay local and never log the financial payload',async()=>{
  const helper=read('src/features/billing/pixAutomatic.ts')
  const checkout=read('src/features/billing/CheckoutPage.tsx')
  const payload='00020101021226850014br.gov.bcb.pix2563sandbox.example/automatic52040000530398654041.005802BR5906ALOVIA6009SAO PAULO62070503***6304ABCD'
  const dataUrl=await createPixQrDataUrl(payload)
  let copied=''
  await copyPixPayload(payload,async value=>{copied=value})

  assert.match(dataUrl,/^data:image\/png;base64,/)
  assert.equal(copied,payload)
  assert.match(checkout,/Pix Copia e Cola/)
  assert.match(checkout,/Copiar código Pix/)
  assert.match(checkout,/Código copiado/)
  assert.doesNotMatch(`${helper}\n${checkout}`,/qrserver|api\.qr|console\.(?:log|info|debug)/i)
})

test('waiting never unlocks access and paid is the only status that synchronizes the session',()=>{
  const checkout=read('src/features/billing/CheckoutPage.tsx')
  const paidBlock=checkout.match(/if\(current\.status==='paid'\)[\s\S]*?return\n\s*\}/)?.[0]??''

  assert.equal(PIX_STATUS_POLL_MS,4000)
  assert.match(checkout,/Aguardando pagamento e autorização/)
  assert.match(checkout,/Assim que o banco confirmar o pagamento e a autorização/)
  assert.doesNotMatch(checkout,/Pagamento aprovado/)
  assert.match(paidBlock,/await syncSession\(\)/)
  assert.match(paidBlock,/navigate\('\/app\/onboarding'/)
  assert.equal((checkout.match(/await syncSession\(\)/g)??[]).length,1)
  assert.equal(isTerminalCheckoutStatus('active'),false)
  assert.equal(isTerminalCheckoutStatus('paid'),true)
})

test('expired and refused flows are recoverable without silently selecting card',()=>{
  const checkout=read('src/features/billing/CheckoutPage.tsx')

  assert.match(checkout,/O código Pix expirou/)
  assert.match(checkout,/Gerar novo Pix/)
  assert.match(checkout,/Não foi possível ativar o Pix Automático/)
  assert.match(checkout,/Tentar novamente/)
  assert.match(checkout,/O Pix Automático não está disponível[\s\S]*pagar com cartão de crédito/)
  assert.match(checkout,/onClick=\{props\.onCard\}>Pagar com cartão de crédito/)
  assert.doesNotMatch(checkout,/setPaymentMethod\('credit_card'\)[\s\S]*catch/)
})

test('card flow and commercial guarantees remain intact',()=>{
  const checkout=read('src/features/billing/CheckoutPage.tsx')

  assert.match(checkout,/\/credit-card/)
  assert.match(checkout,/card_number:cardDigits/)
  assert.match(checkout,/checkoutMode==='hosted'/)
  assert.match(checkout,/Garantia de 7 dias/)
  assert.doesNotMatch(checkout,/7 dias grátis|teste grátis/i)
  assert.match(checkout,/Pagamento: <strong>\{paymentMethod==='pix_automatic'\?'Pix Automático':'Cartão de crédito'\}/)
})
