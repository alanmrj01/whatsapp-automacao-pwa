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

test('payment priority comes from runtime capabilities and Pix stays visible when unavailable',()=>{
  const checkout=read('src/features/billing/CheckoutPage.tsx')
  const profileLoader=checkout.match(/const loadProfile=useCallback[\s\S]*?\},\[cycleParam,planId\]\)/)?.[0]??''
  const selection=checkout.match(/const selectPaymentMethod=[\s\S]*?\n  const changePaymentMethod=/)?.[0]??''

  assert.match(checkout,/pix_automatic_available:boolean/)
  assert.match(checkout,/native_card_checkout_available:boolean/)
  assert.match(profileLoader,/nextProfile\.pix_automatic_available[\s\S]*'pix_automatic'[\s\S]*'credit_card'/)
  assert.match(checkout,/value="pix_automatic" checked=\{paymentMethod==='pix_automatic'\}/)
  assert.match(checkout,/Indisponível/)
  assert.match(checkout,/Temporariamente indisponível pela plataforma que processa os pagamentos/)
  assert.match(checkout,/value="credit_card" checked=\{paymentMethod==='credit_card'\}/)
  assert.match(selection,/setPaymentMethod\(method\)/)
  assert.match(selection,/rotateAttempt\(method\)/)
  assert.doesNotMatch(selection,/prepareCardCheckout|\/billing\/checkouts/)
  assert.match(profileLoader,/\/billing\/checkout-profile/)
  assert.doesNotMatch(profileLoader,/\/billing\/checkouts/)
})

test('Pix creation sends only the supported identification contract with its own idempotency key',()=>{
  const checkout=read('src/features/billing/CheckoutPage.tsx')

  assert.match(checkout,/headers:\{'Idempotency-Key':key\}/)
  assert.match(checkout,/payment_method:method/)
  assert.match(checkout,/payer_name:payerNameValue/)
  assert.match(checkout,/payer_cpf_cnpj:payerDocumentValue/)
  assert.match(checkout,/rotateAttempt\(method\)/)
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
  assert.match(checkout,/O Pix Automático está temporariamente indisponível[\s\S]*plataforma que processa os pagamentos[\s\S]*cartão de crédito/)
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

test('card checkout is created just in time and never redirects away from Alovia',()=>{
  const checkout=read('src/features/billing/CheckoutPage.tsx')
  const submit=checkout.match(/const submit=async[\s\S]*?\n  const copyPix=/)?.[0]??''
  const validationPosition=submit.indexOf('const documentDigits=')
  const createPosition=submit.indexOf('checkout??await prepareCardCheckout')
  const nativePosition=submit.indexOf('/credit-card`')

  assert.ok(validationPosition>=0)
  assert.ok(createPosition>validationPosition)
  assert.ok(nativePosition>createPosition)
  assert.match(submit,/checkoutMode==='hosted'[\s\S]*temporariamente indisponível/)
  assert.doesNotMatch(submit,/window\.location\.assign/)
  assert.match(submit,/checkoutMode!=='native'/)
  assert.match(checkout,/paymentMethod==='credit_card'[\s\S]*CardPaymentContent/)
})

test('card selection cancels an existing Pix before creating a card checkout',()=>{
  const checkout=read('src/features/billing/CheckoutPage.tsx')
  const switchFlow=checkout.match(/const changePaymentMethod=async[\s\S]*?\n  const generatePix=/)?.[0]??''
  const cancelPosition=switchFlow.indexOf('/cancel`')
  const cardPosition=switchFlow.indexOf("selectPaymentMethod('credit_card')")

  assert.ok(cancelPosition>=0)
  assert.ok(cardPosition>cancelPosition)
  assert.match(switchFlow,/await api\.request<CheckoutStatusResponse>/)
  assert.match(switchFlow,/if\(method==='credit_card'&&checkout\?\.payment_method==='pix_automatic'\)/)
  assert.match(switchFlow,/catch \(caught\)[\s\S]*Não foi possível cancelar o Pix Automático/)
  assert.equal((switchFlow.match(/selectPaymentMethod\('credit_card'\)/g)??[]).length,1)
})

test('expired Pix retry cancels the previous authorization before creating another Pix',()=>{
  const checkout=read('src/features/billing/CheckoutPage.tsx')
  const restart=checkout.match(/const restart=async[\s\S]*?\n  const submit=/)?.[0]??''
  const cancelPosition=restart.indexOf('/cancel`')
  const clearPosition=restart.indexOf('clearPaymentState()')
  const createPosition=restart.indexOf('await generatePix(key)')

  assert.ok(cancelPosition>=0)
  assert.ok(clearPosition>cancelPosition)
  assert.ok(createPosition>clearPosition)
  assert.match(restart,/Não conseguimos encerrar o Pix anterior\. Aguarde alguns instantes e tente novamente\./)
  assert.match(restart,/catch \{[\s\S]*setError[\s\S]*return/)
  assert.match(restart,/if\(initialPaymentReceived\)[\s\S]*return/)
})

test('a received initial payment blocks another payment and exposes reconciliation copy',()=>{
  const checkout=read('src/features/billing/CheckoutPage.tsx')
  const protectedState=checkout.match(/\{paymentNeedsReconciliation&&[\s\S]*?\}\n    \{terminal&&!paymentNeedsReconciliation/)?.[0]??''

  assert.match(checkout,/initial_payment_received:boolean/)
  assert.match(checkout,/setInitialPaymentReceived\(current\.initial_payment_received\)/)
  assert.match(checkout,/if\(initialPaymentReceived\)/)
  assert.match(protectedState,/Pagamento recebido/)
  assert.match(protectedState,/Não faça outro pagamento/)
  assert.match(protectedState,/Voltar para a Alovia/)
  assert.doesNotMatch(protectedState,/Tentar novamente|Gerar novo Pix|Pagar com cartão/)
})

test('failed Pix without initial payment remains retryable',()=>{
  const checkout=read('src/features/billing/CheckoutPage.tsx')
  const retryState=checkout.match(/\{terminal&&!paymentNeedsReconciliation&&[\s\S]*?\}\n  <\/div>/)?.[0]??''

  assert.match(retryState,/Não foi possível ativar o Pix Automático/)
  assert.match(retryState,/Tentar novamente/)
  assert.match(retryState,/Pagar com cartão de crédito/)
})

test('uncertain Pix authorization enters protected reconciliation state without another payment CTA',()=>{
  const checkout=read('src/features/billing/CheckoutPage.tsx')
  const prepare=checkout.match(/const prepareCheckout=useCallback[\s\S]*?\},\[cycleParam,planId\]\)/)?.[0]??''
  const protectedState=checkout.match(/\{props\.reconciliationPending&&[\s\S]*?\}\n    \{!props\.reconciliationPending/)?.[0]??''

  assert.match(checkout,/pixReconciliationPending/)
  assert.match(prepare,/Pix Automatic authorization is being reconciled/)
  assert.match(prepare,/setPixReconciliationPending\(true\)/)
  assert.match(protectedState,/Estamos confirmando seu Pix Automático/)
  assert.match(protectedState,/Não faça outro pagamento agora/)
  assert.match(protectedState,/Voltar para a Alovia/)
  assert.doesNotMatch(protectedState,/Gerar Pix Automático|Tentar novamente|Pagar com cartão/)
  assert.match(checkout,/initialPaymentReceived\|\|pixReconciliationPending/)
})

test('reconciliation state blocks method switching and Pix resubmission',()=>{
  const checkout=read('src/features/billing/CheckoutPage.tsx')
  const switchFlow=checkout.match(/const changePaymentMethod=async[\s\S]*?\n  const generatePix=/)?.[0]??''
  const submit=checkout.match(/const submit=async[\s\S]*?\n  const copyPix=/)?.[0]??''

  assert.match(switchFlow,/if\(pixReconciliationPending\)[\s\S]*Não faça outro pagamento agora[\s\S]*return/)
  assert.match(submit,/if\(paymentMethod==='pix_automatic'&&pixReconciliationPending\)return/)
})


test('native card checkout stays inside Alovia and provider outages are explicit',()=>{
  const checkout=read('src/features/billing/CheckoutPage.tsx')

  assert.match(checkout,/nativeCardCheckoutAvailable\s*\?\s*<CardPaymentContent/)
  assert.match(checkout,/PaymentUnavailableContent/)
  assert.doesNotMatch(checkout,/window\.location\.assign\(cardCheckout\.checkout_url\)/)
  assert.match(checkout,/A plataforma que processa os pagamentos está temporariamente indisponível/)
  assert.match(checkout,/Não tente pagar novamente agora/)
  assert.doesNotMatch(checkout,/className=\{\`checkout-timer/)
})
