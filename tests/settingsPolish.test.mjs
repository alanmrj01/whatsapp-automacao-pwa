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
  assert.match(automation,/Escolha um contato disponível na agenda do aparelho\./)
})

test('ALOVIA contact source lists every current conversation contact in a collapsible select',()=>{
  const automation=read('src/features/more/AutomationSettingsPage.tsx')
  const api=read('src/features/operations/api.ts')

  assert.match(api,/export function useConversationContacts\(\)/)
  assert.match(api,/page_size=\$\{pageSize\}/)
  assert.match(api,/while\(items\.length<total\)/)
  assert.match(automation,/useConversationContacts\(\)/)
  assert.match(automation,/Contato do ALOVIA<select/)
  assert.match(automation,/customer_whatsapp_id\?\?item\.customer_phone/)
  assert.match(automation,/conversationContacts\.map\(item=><option/)
  assert.match(automation,/value=\{item\.whatsappId\}/)
  assert.match(automation,/Esta lista mostra os contatos das conversas existentes no ALOVIA\./)
})

test('catalog autosave validates only edited items and preserves dirty drafts across refetches',()=>{
  const catalog=read('src/features/more/MaterialsCatalogPage.tsx')

  assert.match(catalog,/const serverDrafts=useRef<Record<string,Draft>>\(\{\}\)/)
  assert.match(catalog,/const hasUnsavedLocalEdit=/)
  assert.match(catalog,/draftChanged\(currentDraft,previousDraft\)/)
  assert.match(catalog,/hasUnsavedLocalEdit\?currentDraft:incoming\[item\.id\]/)

  assert.match(catalog,/const changedMaterials=activeMaterials\.filter/)
  assert.match(catalog,/const changedEquipment=equipmentReferences\.filter/)
  assert.match(catalog,/const validChangedMaterials=changedMaterials\.filter/)
  assert.match(catalog,/const validChangedEquipment=changedEquipment\.filter/)
  assert.match(catalog,/const hasSavableChanges=validChangedMaterials\.length>0\|\|validChangedEquipment\.length>0/)
  assert.doesNotMatch(catalog,/activeMaterials\.some\(item=>materialDraftInvalid\(item\.id\)\)\|\|\s*equipmentReferences\.some/)

  assert.match(catalog,/if\(!hydrated\.current\|\|!canEdit\|\|!hasSavableChanges\)return/)
  assert.match(catalog,/window\.setTimeout\(\(\)=>\{void save\(false\)\},1200\)/)
  assert.match(catalog,/for\(const item of validChangedMaterials\)/)
  assert.match(catalog,/for\(const item of validChangedEquipment\)/)
})

test('catalog floppy save remains actionable and explicitly triggers a manual save',()=>{
  const catalog=read('src/features/more/MaterialsCatalogPage.tsx')

  assert.match(catalog,/aria-label="Salvar catálogo"/)
  assert.match(catalog,/disabled=\{update\.isPending\|\|updateBusiness\.isPending\|\|!hasChanges\}/)
  assert.match(catalog,/onClick=\{\(\)=>void save\(true\)\}/)
  assert.match(catalog,/if\(manual\)setSaveAttempted\(true\)/)
  assert.match(catalog,/if\(!hasSavableChanges\)\{[\s\S]*if\(manual\)setSaveState\('error'\)/)
})
