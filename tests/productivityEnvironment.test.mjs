import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('productivity Netlify config is fail-closed and never proxies to production', () => {
  const config = read('netlify.toml')
  assert.match(config, /PRODUCTIVITY ENVIRONMENT ONLY/)
  assert.match(config, /from = "\/api\/\*"/)
  assert.match(config, /status = 404/)
  assert.doesNotMatch(config, /whatsapp-backend-186627697999\.southamerica-east1\.run\.app/)
  assert.doesNotMatch(config, /alovia\.netlify\.app/)
})

test('productivity branch runs the same PWA validation workflow as main', () => {
  const workflow = read('.github/workflows/pwa-validation.yml')
  assert.match(workflow, /branches:\s*\[main, productivity\]/)
})
