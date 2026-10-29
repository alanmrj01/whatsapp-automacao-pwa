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

test('Pix comum is the production default and Pix Automático stays fail-closed',()=>{
  const checkout=read('src/features/billing/CheckoutPage.tsx')
  const profileLoader=checkout.match(/const loadProfile=useCallback[\s\S]*?\},\[cycleParam,planId\]\)/)?.[0]??''
  const selection=checkout.match(/const selectPaymentMethod=[\s\S]*?\n  const changePaymentMethod=/)?.[0]??''

  assert.match(checkout,/VITE_BILLING_PIX_AUTOMATIC_ENABLED/)
  assert.match(checkout,/useState<PaymentMethod>\('pix'\)/)
  assert.match(checkout,/profile\.pix_available&&<label/)
  assert.match(checkout,/value="pix" checked=\{paymentMethod==='pix'\}/)
  assert.match(checkout,/PIX_AUTOMATIC_ENABLED&&profile\.pix_automatic_available&&<label/)
  assert.match(checkout,/value="pix_automatic" checked=\{paymentMethod==='pix_automatic'\}/)
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

test('Pix receiver notice is isolated to the generated Pix state with the approved copy',()=>{
  const checkout=read('src/features/billing/CheckoutPage.tsx')

  assert.match(checkout,/checkout-pix-receiver-notice/)
  assert.match(checkout,/Pagamento seguro/)
  assert.match(checkout,/No seu banco, o recebedor aparecerá como/)
  assert.match(checkout,/68\.936\.099 ALAN DE MAGALHAES RAIMUNDO JUNIOR\./)
  assert.match(checkout,/Isso acontece por uma regra cadastral do Pix para contas MEI/)
  assert.match(checkout,/Seu pagamento é para a Alovia normalmente\./)
  assert.ok(checkout.indexOf('checkout-pix-receiver-notice')>checkout.indexOf('props.checkout&&!terminal&&!props.initialPaymentReceived'))
})

test('Pix funnel tracking is deduplicated, payment-safe and never sends QR or payer data',()=>{
  const checkout=read('src/features/billing/CheckoutPage.tsx')
  const tracking=checkout.match(/const trackPixEvent=useCallback[\s\S]*?\},\[user\?\.active_business_id,user\?\.id\]\)/)?.[0]??''
  const abandonment=checkout.match(/const trackPixAbandonIntent=useCallback[\s\S]*?\},\[trackPixEvent\]\)/)?.[0]??''

  for(const eventName of ['pix_payment_viewed','pix_payment_abandon_intent','pix_payment_expired_unpaid']) {
    assert.match(checkout,new RegExp(eventName))
  }
  for(const property of ['checkout_id','plan','billing_cycle','amount_cents']) {
    assert.match(tracking,new RegExp(property))
  }
  assert.match(tracking,/payment_method:'pix'/)
  assert.doesNotMatch(tracking,/pix_payload|payer_|cpf|cnpj|token/i)
  assert.match(checkout,/viewedPixCheckoutIds\.current\.has\(checkout\.checkout_id\)/)
  assert.match(checkout,/expiredPixCheckoutIds\.current\.has\(currentCheckout\.checkout_id\)/)
  assert.match(abandonment,/abandonedPixCheckoutIds\.current\.has\(currentCheckout\.checkout_id\)/)
  assert.match(abandonment,/status==='paid'/)
  assert.match(abandonment,/paidPixCheckoutIds\.current\.has/)
  assert.match(checkout,/paidPixCheckoutIds\.current\.add\(checkoutId\)/)
  assert.match(checkout,/onClick=\{\(\)=>trackPixAbandonIntent/)
  assert.doesNotMatch(checkout,/beforeunload/)
})

test('waiting never unlocks access and paid is the only status that synchronizes the session',()=>{
  const checkout=read('src/features/billing/CheckoutPage.tsx')
  const paidBlock=checkout.match(/if\(current\.status==='paid'\)[\s\S]*?return\n\s*\}/)?.[0]??''

  assert.equal(PIX_STATUS_POLL_MS,4000)
  assert.match(checkout,/Aguardando pagamento/)
  assert.match(checkout,/Na renovação, volte à Alovia para gerar um novo Pix/)
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
  assert.match(checkout,/Não conseguimos gerar o Pix agora[\s\S]*cartão de crédito/)
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
  assert.match(checkout,/Pagamento: <strong>\{paymentMethod==='pix_automatic'\?'Pix Automático':paymentMethod==='pix'\?'Pix':'Cartão de crédito'\}/)
  assert.match(checkout,/Renovação manual por Pix a cada ciclo/)
})

test('card checkout is created just in time by submit and preserves hosted and native paths',()=>{
  const checkout=read('src/features/billing/CheckoutPage.tsx')
  const submit=checkout.match(/const submit=async[\s\S]*?\n  const copyPix=/)?.[0]??''
  const validationPosition=submit.indexOf('const documentDigits=')
  const createPosition=submit.indexOf('checkout??await prepareCardCheckout')
  const nativePosition=submit.indexOf('/credit-card`')

  assert.ok(validationPosition>=0)
  assert.ok(createPosition>validationPosition)
  assert.ok(nativePosition>createPosition)
  assert.match(submit,/checkoutMode==='hosted'[\s\S]*window\.location\.assign/)
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
  assert.match(switchFlow,/if\(method==='credit_card'&&\(checkout\?\.payment_method==='pix'\|\|checkout\?\.payment_method==='pix_automatic'\)\)/)
  assert.match(switchFlow,/catch \(caught\)[\s\S]*Não foi possível cancelar o Pix\./)
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

  assert.match(retryState,/Não foi possível concluir o Pix/)
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


test('hosted card checkout is fail-closed by default and does not ask for card data before redirect',()=>{
  const checkout=read('src/features/billing/CheckoutPage.tsx')

  assert.match(checkout,/VITE_BILLING_NATIVE_CARD_CHECKOUT_ENABLED/)
  assert.match(checkout,/NATIVE_CARD_CHECKOUT_ENABLED\s*\?\s*<CardPaymentContent/)
  assert.match(checkout,/HostedCardPaymentContent/)
  assert.match(checkout,/Continuar para pagamento seguro/)
  assert.match(checkout,/if\(!NATIVE_CARD_CHECKOUT_ENABLED\)/)
  assert.match(checkout,/NATIVE_CARD_CHECKOUT_ENABLED&&\(/)
})

test('Pix comum communicates manual renewal without claiming automatic debit',()=>{
  const checkout=read('src/features/billing/CheckoutPage.tsx')

  assert.match(checkout,/Pague agora por Pix\. Na renovação, você poderá gerar um novo Pix para continuar\./)
  assert.match(checkout,/automatic\?'Gerar autorização segura':'Gerar cobrança Pix'/)
  assert.match(checkout,/automatic&&props\.remaining!==null&&<div><dt>Validade<\/dt><dd>\{formatRemaining\(props\.remaining\)\}<\/dd><\/div>/)
  assert.doesNotMatch(checkout,/checkout-timer/)
  assert.match(checkout,/payment_method:method/)
  assert.match(checkout,/method==='pix'\|\|method==='pix_automatic'/)
  assert.match(checkout,/paymentMethod==='pix'\?'Renovação manual por Pix a cada ciclo':'Renovação automática'/)
})

test('common Pix does not promise automatic renewal generation',()=>{
  const checkout=read('src/features/billing/CheckoutPage.tsx')
  assert.doesNotMatch(checkout,/geraremos um novo Pix|um novo Pix será gerado|Alovia gerará um novo Pix/i)
  assert.match(checkout,/Na renovação, você poderá gerar um novo Pix/)
  assert.match(checkout,/Renovação manual por Pix a cada ciclo/)
})

