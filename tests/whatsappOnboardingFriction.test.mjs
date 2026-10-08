import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('pending banner continues the WhatsApp action instead of stopping at the status page', () => {
  const shell=read('src/app/AppShell.tsx')
  const whatsapp=read('src/features/whatsapp/WhatsAppPage.tsx')
  const coexistence=read('src/features/whatsapp/CoexistenceInfoPage.tsx')
  const embedded=read('src/features/whatsapp/EmbeddedSignupButton.tsx')
  assert.match(shell,/whatsapp\?continuar=1/)
  assert.match(whatsapp,/continueConnection/)
  assert.match(whatsapp,/business\?auto=1/)
  assert.match(coexistence,/autoStart=\{searchParams\.get\('auto'\)==='1'\}/)
  assert.match(embedded,/autoStart=false/)
  assert.match(embedded,/setAutoReady\(true\)/)
  assert.match(embedded,/Conexão preparada\. Toque abaixo para abrir a autorização da Meta\./)
})

test('connection choice starts with desired experience and only then asks about WhatsApp Business', () => {
  const sheet=read('src/features/whatsapp/ConnectWhatsAppSheet.tsx')
  assert.match(sheet,/Como você quer usar a Alovia com este número\?/)
  assert.match(sheet,/Atender e acompanhar tudo pela Alovia/)
  assert.match(sheet,/Continuar usando também o WhatsApp Business/)
  assert.match(sheet,/Como você usa este número hoje\?/)
  assert.match(sheet,/Já utilizo o WhatsApp Business/)
  assert.match(sheet,/Ainda não tenho o WhatsApp Business/)
  assert.match(sheet,/preparar:'1'/)
})

test('users without WhatsApp Business receive a backup-first guided migration', () => {
  const guide=read('src/features/whatsapp/WhatsAppBusinessSetupGuide.tsx')
  assert.match(guide,/proteja suas conversas/i)
  assert.match(guide,/Backup de conversas/)
  assert.match(guide,/mensagens antigas podem ser perdidas/i)
  assert.match(guide,/play\.google\.com\/store\/apps\/details\?id=com\.whatsapp\.w4b/)
  assert.match(guide,/apps\.apple\.com\/app\/whatsapp-business\/id1386412985/)
  assert.match(guide,/Este número já está funcionando no WhatsApp Business/)
  assert.match(guide,/business\?\$\{query\.toString\(\)\}/)
})

test('exclusive Alovia path uses the guarded Meta API-only flow', () => {
  const page=read('src/features/whatsapp/ApiOnlyInfoPage.tsx')
  const button=read('src/features/whatsapp/ApiOnlyEmbeddedSignupButton.tsx')
  assert.match(page,/exclusivamente na Alovia/)
  assert.match(page,/ApiOnlyEmbeddedSignupButton/)
  assert.match(button,/\/whatsapp\/onboarding\/api-only\/start/)
  assert.match(button,/\/whatsapp\/onboarding\/api-only\/complete/)
  assert.match(button,/registration_pin/)
  assert.match(button,/PIN de segurança do número/)
})
