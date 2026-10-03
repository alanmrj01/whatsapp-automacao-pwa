import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('Configurações replaces Mais without breaking existing routes',()=>{
  const more=read('src/features/more/MorePage.tsx')
  const navigation=read('src/components/navigation.ts')
  const shell=read('src/app/AppShell.tsx')
  const accounts=read('src/features/more/AccountPages.tsx')
  const router=read('src/app/router.tsx')

  assert.match(more,/<h1>Configurações<\/h1>/)
  assert.match(navigation,/label: 'Configurações', to: '\/app\/mais'/)
  assert.match(shell,/'\/app\/mais': 'Configurações'/)
  assert.match(accounts,/>Configurações<\/Link>/)

  // Keep the established URLs stable for accounts already in operation.
  assert.match(router,/path="mais" element=\{<MorePage \/>\}/)
  assert.match(router,/path="mais\/usuario"/)
})

test('Configurações includes a second logout action at the bottom',()=>{
  const more=read('src/features/more/MorePage.tsx')
  const css=read('src/styles/operational-app.css')

  assert.match(more,/SessionActions/)
  assert.match(more,/settings-logout-section/)
  assert.match(css,/\.settings-logout-section/)
})

test('device contact picker is the default and preserves safe fallbacks',()=>{
  const automation=read('src/features/more/AutomationSettingsPage.tsx')

  assert.match(automation,/useState<'device'\|'customer'\|'manual'>\('device'\)/)
  assert.match(automation,/getProperties/)
  assert.match(automation,/contacts!\.select\(properties,\{multiple:false\}\)/)
  assert.match(automation,/devicePhones\.length>1/)
  assert.match(automation,/Buscar no ALOVIA/)
  assert.match(automation,/Adicionar pelo número/)
  assert.match(automation,/Contatos salvos somente dentro do WhatsApp não são liberados diretamente para um PWA/)
})

test('ALOVIA contact source lists every current conversation contact in a collapsible select',()=>{
  const automation=read('src/features/more/AutomationSettingsPage.tsx')
  const api=read('src/features/operations/api.ts')

  assert.match(api,/export function useConversationContacts\(\)/)
  assert.match(api,/page_size=\$\{pageSize\}/)
  assert.match(api,/while\(items\.length<total\)/)
  assert.match(automation,/useConversationContacts\(\)/)
  assert.match(automation,/Contato do ALOVIA<select/)
  assert.match(automation,/conversationContacts\.map\(item=><option/)
  assert.match(automation,/Esta lista mostra os contatos das conversas existentes no ALOVIA\./)
})