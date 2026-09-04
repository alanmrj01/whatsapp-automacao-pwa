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
  assert.match(brand, /brand-mark__snow/)
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

test('preview uses the approved company name, waiting label and service icons', () => {
  const preview = read('src/features/preview/PlatformPreviewPage.tsx')
  assert.doesNotMatch(preview, /PEMA TESTE|>Leads\s/)
  assert.equal(preview.match(/PEMA Ar Condicionado/g)?.length, 2)
  assert.match(preview, /Aguardando atendimento <span>12<\/span>/)
  assert.match(preview, /<Sparkles aria-hidden="true"\/><span>Limpeza<\/span>/)
  assert.match(preview, /<Gauge aria-hidden="true"\/><span>Carga de gás<\/span>/)
  assert.match(preview, /src="\/refrigeration-hero\.webp"/)
  const hero = readFileSync(new URL('../public/refrigeration-hero.webp', import.meta.url))
  assert.equal(hero.toString('ascii', 0, 4), 'RIFF')
  assert.equal(hero.toString('ascii', 8, 12), 'WEBP')
  assert.ok(hero.length < 150_000, 'mobile hero must stay lightweight')
})

test('UI and install icons share the circular bubble and centered six-arm snowflake', () => {
  const brand = read('src/components/BrandMark.tsx')
  const bubble = brand.match(/<path d="([^"]+)" strokeWidth="6"/)[1]
  const snow = brand.match(/<path key=\{angle\} d="([^"]+)"/)[1]
  assert.match(bubble, /a24 24/)
  assert.match(brand, /\[0, 60, 120, 180, 240, 300\]/)
  for (const asset of ['app-icon.svg', 'app-icon-maskable.svg']) {
    const icon = read(`public/${asset}`)
    assert.ok(icon.includes(`d="${bubble}"`))
    assert.ok(icon.includes('transform="translate(32 31)"'))
    assert.equal(icon.split(`d="${snow}"`).length - 1, 6)
    assert.match(icon, /fill="#0b67f0"/)
  }
  const styles = read('src/styles/approved-mockups.css')
  assert.doesNotMatch(styles, /\.brand-mark svg path\s*\{/)
})

test('manifest and Apple home screen use current PNG icons at native sizes', () => {
  const manifest = read('vite.config.ts')
  for (const [asset, size] of [
    ['app-icon-192.png', 192],
    ['app-icon-512.png', 512],
    ['app-icon-maskable-512.png', 512],
  ]) {
    const png = readFileSync(new URL(`../public/${asset}`, import.meta.url))
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
    assert.equal(png.readUInt32BE(16), size)
    assert.equal(png.readUInt32BE(20), size)
    assert.ok(manifest.includes(`src: '/${asset}'`))
    assert.ok(manifest.includes(`sizes: '${size}x${size}'`))
  }
  assert.match(read('index.html'), /rel="apple-touch-icon" href="\/app-icon-192\.png"/)
})
