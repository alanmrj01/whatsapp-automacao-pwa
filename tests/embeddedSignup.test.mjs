import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canStartEmbeddedSignup,
  createEmbeddedSignupRunner,
  EmbeddedSignupCancelledError,
  EmbeddedSignupError,
  launchMetaEmbeddedSignup,
  trustedMetaOriginHostname,
} from '../src/features/whatsapp/embeddedSignup.ts'

const configuration = {
  app_id: '111111111111111',
  configuration_id: '222222222222222',
  graph_version: 'v25.0',
  embedded_signup_version: 'v4',
  mode: 'coexistence',
}

function runtimeFor(login, {popup = null, fastPopupClose = false, clock = null} = {}) {
  const listeners = new Set()
  const runtime = {
    FB: undefined,
    fbAsyncInit: undefined,
    setTimeout: clock?.setTimeout ?? ((fn, delay) => {
      if (fastPopupClose && delay === 1_500) {
        queueMicrotask(fn)
        return 99
      }
      return setTimeout(fn, delay)
    }),
    clearTimeout: clock?.clearTimeout ?? clearTimeout,
    setInterval: clock?.setInterval ?? ((fn, delay) => {
      if (fastPopupClose) {
        queueMicrotask(fn)
        return 98
      }
      return setInterval(fn, delay)
    }),
    clearInterval: clock?.clearInterval ?? clearInterval,
    logs: [],
    console: {
      info(...values) { runtime.logs.push(values) },
    },
    open() { return popup },
    addEventListener(type, listener) { if (type === 'message') listeners.add(listener) },
    removeEventListener(type, listener) { if (type === 'message') listeners.delete(listener) },
    document: {
      getElementById() { return null },
      createElement() {
        return {
          addEventListener() {},
          id: '', async: false, defer: false, crossOrigin: '', src: '',
        }
      },
      head: {
        appendChild() {
          runtime.FB = {
            init(value) { runtime.initialized = value },
            login(callback, options) {
              runtime.loginOptions = options
              login({runtime, listeners, callback})
            },
          }
          queueMicrotask(() => runtime.fbAsyncInit())
        },
      },
    },
  }
  return runtime
}

function send(listeners, event, origin = 'https://www.facebook.com') {
  for (const listener of listeners) listener({origin, data:JSON.stringify(event)})
}

test('paid owner/admin inicia Meta; free e perfis de leitura nunca iniciam', () => {
  assert.equal(canStartEmbeddedSignup('paid', 'owner'), true)
  assert.equal(canStartEmbeddedSignup('paid', 'admin'), true)
  assert.equal(canStartEmbeddedSignup('free', 'owner'), false)
  assert.equal(canStartEmbeddedSignup('paid', 'attendant'), false)
  assert.equal(canStartEmbeddedSignup('paid', 'viewer'), false)
})

test('coexistence usa os parâmetros oficiais e combina code com sessão Meta', async () => {
  const runtime = runtimeFor(({listeners, callback}) => {
    callback({authResponse:{code:'short-lived-code'}})
    send(listeners, {
      type:'WA_EMBEDDED_SIGNUP',
      event:'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING',
      data:{waba_id:'333333333333333', phone_number_id:'444444444444444'},
    })
  })
  const result = await launchMetaEmbeddedSignup(configuration, runtime)
  assert.deepEqual(result, {
    authorization_code:'short-lived-code',
    waba_id:'333333333333333',
    phone_number_id:'444444444444444',
  })
  assert.deepEqual(runtime.initialized, {
    appId:configuration.app_id, cookie:false, xfbml:false, version:'v25.0',
  })
  assert.deepEqual(runtime.loginOptions, {
    config_id:configuration.configuration_id,
    response_type:'code',
    override_default_response_type:true,
    extras:{
      sessionInfoVersion:'3',
      version:'v4',
      featureType:'whatsapp_business_app_onboarding',
    },
  })
})

test('SessionInfo pode chegar antes do authorization code', async () => {
  const runtime = runtimeFor(({listeners, callback}) => {
    send(listeners, {
      type:'WA_EMBEDDED_SIGNUP',
      event:'FINISH',
      data:{waba_id:'333333333333333', phone_number_id:'444444444444444'},
    })
    callback({authResponse:{code:'late-code'}})
  })
  assert.deepEqual(await launchMetaEmbeddedSignup(configuration, runtime), {
    authorization_code:'late-code',
    waba_id:'333333333333333',
    phone_number_id:'444444444444444',
  })
})

test('SessionInfo válido não depende de whitelist rígida de event', async () => {
  const runtime = runtimeFor(({listeners, callback}) => {
    callback({authResponse:{code:'short-lived-code'}})
    send(listeners, {
      type:'WA_EMBEDDED_SIGNUP',
      data:{waba_id:'333333333333333'},
    })
  })
  assert.deepEqual(await launchMetaEmbeddedSignup(configuration, runtime), {
    authorization_code:'short-lived-code',
    waba_id:'333333333333333',
  })
})

test('evento com current_step não conclui antes do SessionInfo terminal', async () => {
  let terminalSent = false
  const runtime = runtimeFor(({listeners, callback}) => {
    callback({authResponse:{code:'short-lived-code'}})
    send(listeners, {
      type:'WA_EMBEDDED_SIGNUP',
      event:'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING',
      data:{current_step:'PHONE_NUMBER_SETUP', waba_id:'333333333333333'},
    })
    setTimeout(() => {
      terminalSent = true
      send(listeners, {
        type:'WA_EMBEDDED_SIGNUP',
        event:'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING',
        data:{waba_id:'333333333333333'},
      })
    }, 10)
  })

  assert.deepEqual(await launchMetaEmbeddedSignup(configuration, runtime), {
    authorization_code:'short-lived-code',
    waba_id:'333333333333333',
  })
  assert.equal(terminalSent, true)
  assert.match(JSON.stringify(runtime.logs), /wa_session_intermediate_step/)
})

test('subdomínio HTTPS legítimo da Meta entrega SessionInfo no mobile', async () => {
  const runtime = runtimeFor(({listeners, callback}) => {
    callback({authResponse:{code:'mobile-code'}})
    send(listeners, {
      type:'WA_EMBEDDED_SIGNUP',
      event:'FINISH',
      data:{waba_id:'333333333333333'},
    }, 'https://m.facebook.com')
  })
  assert.equal(
    (await launchMetaEmbeddedSignup(configuration, runtime)).waba_id,
    '333333333333333',
  )
})

test('origens parecidas com facebook.com e HTTP são rejeitadas', async () => {
  assert.equal(trustedMetaOriginHostname('https://m.facebook.com'), 'm.facebook.com')
  assert.equal(trustedMetaOriginHostname('https://facebook.com.evil.example'), null)
  assert.equal(trustedMetaOriginHostname('https://notfacebook.com'), null)
  assert.equal(trustedMetaOriginHostname('http://m.facebook.com'), null)

  const runtime = runtimeFor(({listeners, callback}) => {
    callback({authResponse:{code:'short-lived-code'}})
    send(listeners, {
      type:'WA_EMBEDDED_SIGNUP',
      event:'FINISH',
      data:{waba_id:'999999999999999'},
    }, 'https://facebook.com.evil.example')
    send(listeners, {type:'WA_EMBEDDED_SIGNUP', event:'CANCEL', data:{} })
  })
  await assert.rejects(
    launchMetaEmbeddedSignup(configuration, runtime),
    EmbeddedSignupCancelledError,
  )
})

test('callback vazio no mobile/PWA não cancela enquanto o fluxo Meta continua', async () => {
  const popup = {closed:false}
  const runtime = runtimeFor(({runtime, listeners, callback}) => {
    runtime.open('https://www.facebook.com/dialog')
    callback({})
    setTimeout(() => {
      callback({authResponse:{code:'mobile-code'}})
      send(listeners, {
        type:'WA_EMBEDDED_SIGNUP',
        event:'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING',
        data:{waba_id:'333333333333333'},
      })
      popup.closed = true
    }, 10)
  }, {popup})

  const result = await launchMetaEmbeddedSignup(configuration, runtime)
  assert.deepEqual(result, {
    authorization_code:'mobile-code',
    waba_id:'333333333333333',
  })
})

test('popup fechado antes dos retornos tardios não encerra o fluxo', async () => {
  const popup = {closed:false}
  const runtime = runtimeFor(({runtime, listeners, callback}) => {
    runtime.open('https://www.facebook.com/dialog')
    callback({})
    popup.closed = true
    setTimeout(() => {
      callback({authResponse:{code:'late-mobile-code'}})
      send(listeners, {
        type:'WA_EMBEDDED_SIGNUP',
        event:'FINISH',
        data:{waba_id:'333333333333333'},
      })
    }, 10)
  }, {popup, fastPopupClose:true})

  assert.equal(
    (await launchMetaEmbeddedSignup(configuration, runtime)).authorization_code,
    'late-mobile-code',
  )
  assert.match(JSON.stringify(runtime.logs), /popup_closed/)
})

test('timeout encerra com erro sanitizado', async () => {
  let expire
  let timerId = 0
  const clock = {
    setTimeout(fn, delay) {
      timerId += 1
      if (delay === 120_000) expire = fn
      return timerId
    },
    clearTimeout() {},
    setInterval() { return 1 },
    clearInterval() {},
  }
  const runtime = runtimeFor(({callback}) => callback({}), {clock})
  const pending = launchMetaEmbeddedSignup(configuration, runtime)
  await new Promise(resolve => setImmediate(resolve))
  expire()
  await assert.rejects(pending, EmbeddedSignupError)
})

test('CANCEL explícito da Meta continua sendo cancelamento seguro', async () => {
  const runtime = runtimeFor(({listeners, callback}) => {
    callback({})
    send(listeners, {
      type:'WA_EMBEDDED_SIGNUP',
      event:'CANCEL',
      data:{current_step:'PHONE_NUMBER_SETUP'},
    })
  })
  await assert.rejects(
    launchMetaEmbeddedSignup(configuration, runtime),
    EmbeddedSignupCancelledError,
  )
})

test('erro explícito da Meta continua sem expor payload sensível', async () => {
  const runtime = runtimeFor(({listeners, callback}) => {
    callback({authResponse:{code:'short-lived-code'}})
    send(listeners, {type:'WA_EMBEDDED_SIGNUP', event:'ERROR', data:{error_message:'private'}})
  })
  await assert.rejects(
    launchMetaEmbeddedSignup(configuration, runtime),
    EmbeddedSignupError,
  )
})

test('diagnóstico registra somente etapas e presença de IDs', async () => {
  const code = 'private-authorization-code'
  const waba = '333333333333333'
  const phone = '444444444444444'
  const runtime = runtimeFor(({listeners, callback}) => {
    callback({authResponse:{code}})
    send(listeners, {
      type:'WA_EMBEDDED_SIGNUP',
      event:'FINISH',
      data:{waba_id:waba, phone_number_id:phone},
    }, 'https://business.facebook.com')
  })

  await launchMetaEmbeddedSignup(configuration, runtime)
  const logs = JSON.stringify(runtime.logs)
  assert.match(logs, /sdk_ready/)
  assert.match(logs, /login_opened/)
  assert.match(logs, /authorization_code_received/)
  assert.match(logs, /wa_session_event_received/)
  for (const privateValue of [code, waba, phone]) {
    assert.equal(logs.includes(privateValue), false)
  }
})

test('duplo clique compartilha uma única conclusão e atualiza o status uma vez', async () => {
  let starts = 0
  let launches = 0
  let completions = 0
  let updates = 0
  const phases = []
  let release
  const gate = new Promise(resolve => { release = resolve })
  const run = createEmbeddedSignupRunner({
    async start() { starts++; await gate; return configuration },
    async launch() {
      launches++
      return {authorization_code:'code', waba_id:'333333333333333'}
    },
    async complete() {
      completions++
      return {status:'connected', mode:'coexistence', display_phone_number:'•••• 1234'}
    },
    onPhase(phase) { phases.push(phase) },
    async onConnected(connection) {
      updates++
      assert.equal(connection.status, 'connected')
    },
  })
  const first = run()
  const second = run()
  assert.equal(first, second)
  release()
  await Promise.all([first, second])
  assert.deepEqual({starts, launches, completions, updates}, {
    starts:1, launches:1, completions:1, updates:1,
  })
  assert.deepEqual(phases, ['opening', 'processing', 'success'])
})
