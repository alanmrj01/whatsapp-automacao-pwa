import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('Alovia uses the approved refrigeration visual identity', () => {
  const main = read('src/main.tsx')
  const theme = read('src/styles/alovia-theme.css')
  const manifest = read('vite.config.ts')
  const icon = read('public/app-icon.svg')

  assert.match(main, /alovia-theme\.css/)
  assert.match(theme, /--color-primary-700:\s*#073b5c/)
  assert.match(theme, /\.brand-mark::after/)
  assert.match(manifest, /theme_color:\s*'#073b5c'/)
  assert.match(manifest, /climatização e refrigeração/i)
  assert.match(icon, /Ícone Alovia/)
  assert.match(icon, /stroke="#0f6f9e"/)
})

test('niche UX keeps the approved priority and technical context', () => {
  const conversations = read('src/features/conversations/ConversationsPage.tsx')
  const dashboard = read('src/features/dashboard/DashboardPage.tsx')
  const agenda = read('src/features/appointments/AgendaPage.tsx')
  const whatsapp = read('src/features/whatsapp/WhatsAppPage.tsx')

  assert.match(conversations, /aguardando resposta ficam fixados no topo/i)
  assert.match(conversations, /cliente, equipamento ou serviço/i)
  assert.match(dashboard, /Climatização & refrigeração/)
  assert.match(agenda, /Agenda técnica/)
  assert.match(whatsapp, /Do pedido à visita técnica/)
})
