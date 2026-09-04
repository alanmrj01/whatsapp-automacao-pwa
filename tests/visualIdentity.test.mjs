import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('Alovia uses the approved blue refrigeration visual identity', () => {
  const main = read('src/main.tsx')
  const approved = read('src/styles/approved-mockups.css')
  const manifest = read('vite.config.ts')
  const icon = read('public/app-icon.svg')
  const brand = read('src/components/BrandMark.tsx')

  assert.match(main, /approved-mockups\.css/)
  assert.match(approved, /--alovia-blue:\s*#0b67f0/)
  assert.match(approved, /\.brand-mark::after\s*\{\s*content:\s*none/i)
  assert.match(manifest, /theme_color:\s*'#0b67f0'/)
  assert.match(manifest, /climatização e refrigeração/i)
  assert.match(icon, /Ícone Alovia/)
  assert.match(icon, /stroke="#fff"/)
  assert.match(brand, /Snowflake/)
})

test('niche UX keeps the approved priority and technical context', () => {
  const conversations = read('src/features/conversations/ConversationsPage.tsx')
  const dashboard = read('src/features/dashboard/DashboardPage.tsx')
  const agenda = read('src/features/appointments/AgendaPage.tsx')
  const whatsapp = read('src/features/whatsapp/WhatsAppPage.tsx')
  const preview = read('src/features/preview/PlatformPreviewPage.tsx')
  const navigation = read('src/components/navigation.ts')

  assert.match(conversations, /aguardando resposta ficam fixados no topo/i)
  assert.match(conversations, /cliente, equipamento ou serviço/i)
  assert.match(dashboard, /Climatização & refrigeração/)
  assert.match(agenda, /Agenda técnica/)
  assert.match(whatsapp, /Do pedido à visita técnica/)
  assert.match(preview, /Orçamentos em aberto/)
  assert.match(preview, /Aguardando resposta/)
  assert.match(preview, /Equipamentos/)
  assert.doesNotMatch(navigation, /label:\s*'WhatsApp'/)
})
