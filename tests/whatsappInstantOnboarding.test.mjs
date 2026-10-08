import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('WhatsApp pending banner continues the connection instead of only opening the page',async()=>{
  const source=await read('src/app/AppShell.tsx')
  assert.match(source,/\/app\/whatsapp\?continuar=1/)
})

test('connection choice starts with operator preference and guides WhatsApp Business migration',async()=>{
  const source=await read('src/features/whatsapp/ConnectWhatsAppSheet.tsx')
  assert.match(source,/Como você quer usar a Alovia com este número/)
  assert.match(source,/Atender e acompanhar tudo pela Alovia/)
  assert.match(source,/Usar a Alovia e o WhatsApp Business juntos/)
  assert.match(source,/Uso o WhatsApp comum ou ainda não tenho o Business/)
  assert.match(source,/Faça o backup antes de mudar/)
  assert.match(source,/com\.whatsapp\.w4b/)
  assert.match(source,/id1386412985/)
})

test('exclusive mode is functional and keeps explicit backup and app-impact warnings',async()=>{
  const page=await read('src/features/whatsapp/ApiOnlyInfoPage.tsx')
  const action=await read('src/features/whatsapp/ApiOnlyEmbeddedSignupButton.tsx')
  assert.match(page,/Sem backup, você poderá perder o histórico/)
  assert.match(page,/pode deixar de funcionar no app WhatsApp ou WhatsApp Business/)
  assert.match(action,/\/whatsapp\/onboarding\/api-only\/start/)
  assert.match(action,/\/whatsapp\/onboarding\/api-only\/complete/)
})

test('foreground and background push are action-oriented',async()=>{
  const center=await read('src/features/notifications/NotificationCenter.tsx')
  const worker=await read('public/push-sw.js')
  assert.match(center,/Ative os alertas importantes/)
  assert.match(center,/só envia um popup quando você precisa fazer alguma coisa/)
  assert.match(worker,/payload:\{/)
  assert.match(worker,/\/app\/whatsapp/)
  assert.match(worker,/\/app\/mais\/plano/)
})
