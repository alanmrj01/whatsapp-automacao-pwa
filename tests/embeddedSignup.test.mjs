import assert from 'node:assert/strict'
import test from 'node:test'
import {
  cancelMetaEmbeddedSignup,
  canStartEmbeddedSignup,
  createEmbeddedSignupRunner,
  EmbeddedSignupCancelledError,
  EmbeddedSignupError,
  launchMetaEmbeddedSignup,
  resumeMetaEmbeddedSignup,
  trustedMetaOriginHostname,
} from '../src/features/whatsapp/embeddedSignup.ts'

const configuration = {
  app_id: '111111111111111',
  configuration_id: '222222222222222',
  graph_version: 'v25.0',
  embedded_signup_version: 'v4',
  mode: 'coexistence',
}

const passiveClock = {
  setTimeout() { return 1 },
  clearTimeout() {},
  setInterval() { return 1 },
  clearInterval() {},
}

function runtimeFor(login, {popup = null, fastPopupClose = false, clock = null} = {}) {
  const listeners = new Set()
  const windowListeners = new Map()
  const documentListeners = new Map()
  const add = (map, type, listener) => {
    if (!map.has(type)) map.set(type, new Set())
    map.get(type).add(listener)
  }
  const remove = (map, type, listener) => map.get(type)?.delete(listener)
  const dispatch = (map, type) => {
    for (const listener of map.get(type) ?? []) listener()
  }
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
    addEventListener(type, listener) {
      if (type === 'message') listeners.add(listener)
      else add(windowListeners, type, listener)
    },
    removeEventListener(type, listener) {
      if (type === 'message') listeners.delete(listener)
      else remove(windowListeners, type, listener)
    },
    dispatch(type) { dispatch(windowListeners, type) },
    setVisibility(state) {
      runtime.document.visibilityState = state
      dispatch(documentListeners, 'visibilitychange')
    },
    document: {
      visibilityState: 'visible',
      addEventListener(type, listener) { add(documentListeners, type, listener) },
      removeEventListener(type, listener) { remove(documentListeners, type, listener) },
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
    auth_type:'rerequest',
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
  assert.match(JSON.stringify(runtime.logs), /intermediate_step_received/)
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

test('visibility hidden -> visible preserva e retoma a mesma tentativa', async () => {
  let loginCalls = 0
  let resumeRequests = 0
  const observations = []
  const runtime = runtimeFor(({listeners, callback}) => {
    loginCalls++
    if (loginCalls === 1) {
      callback({})
      send(listeners, {
        type:'WA_EMBEDDED_SIGNUP',
        event:'FINISH',
        data:{waba_id:'333333333333333'},
      })
      return
    }
    callback({authResponse:{code:'resumed-mobile-code'}})
  }, {clock:passiveClock})

  const pending = launchMetaEmbeddedSignup(configuration, runtime, {
    onObservation: observation => observations.push(observation),
    onResumeRequired: () => { resumeRequests++ },
  })
  await new Promise(resolve => setImmediate(resolve))
  runtime.setVisibility('hidden')
  runtime.setVisibility('visible')

  assert.equal(resumeRequests, 1)
  assert.equal(resumeMetaEmbeddedSignup(), true)
  assert.deepEqual(await pending, {
    authorization_code:'resumed-mobile-code',
    waba_id:'333333333333333',
  })
  assert.equal(loginCalls, 2)
  assert.deepEqual(
    observations.filter(value => value.stage === 'page_hidden' || value.stage === 'page_visible').map(value => value.stage),
    ['page_hidden', 'page_visible'],
  )
})

test('pageshow durante tentativa oferece retomada sem iniciar outro login', async () => {
  let loginCalls = 0
  let resumeRequests = 0
  let messageListeners
  const runtime = runtimeFor(({listeners, callback}) => {
    loginCalls++
    messageListeners = listeners
    callback({})
  }, {clock:passiveClock})
  const pending = launchMetaEmbeddedSignup(configuration, runtime, {
    onResumeRequired: () => { resumeRequests++ },
  })

  await new Promise(resolve => setImmediate(resolve))
  runtime.dispatch('pageshow')
  assert.equal(resumeRequests, 1)
  assert.equal(loginCalls, 1)
  send(messageListeners, {type:'WA_EMBEDDED_SIGNUP', event:'CANCEL', data:{}})
  await assert.rejects(pending, EmbeddedSignupCancelledError)
})

test('focus durante tentativa oferece retomada sem login concorrente', async () => {
  let loginCalls = 0
  let resumeRequests = 0
  let messageListeners
  const runtime = runtimeFor(({listeners, callback}) => {
    loginCalls++
    messageListeners = listeners
    callback({})
  }, {clock:passiveClock})
  const pending = launchMetaEmbeddedSignup(configuration, runtime, {
    onResumeRequired: () => { resumeRequests++ },
  })

  await new Promise(resolve => setImmediate(resolve))
  runtime.dispatch('focus')
  assert.equal(resumeRequests, 1)
  assert.equal(loginCalls, 1)
  send(messageListeners, {type:'WA_EMBEDDED_SIGNUP', event:'ERROR', data:{}})
  await assert.rejects(pending, EmbeddedSignupError)
})

test('pageshow recupera tentativa quando o callback inicial nunca chega', async () => {
  const callbacks = []
  let messageListeners
  let resumeRequests = 0
  const runtime = runtimeFor(({listeners, callback}) => {
    messageListeners = listeners
    callbacks.push(callback)
  }, {clock:passiveClock})
  const pending = launchMetaEmbeddedSignup(configuration, runtime, {
    onResumeRequired: () => { resumeRequests++ },
  })
  await new Promise(resolve => setImmediate(resolve))

  runtime.dispatch('pagehide')
  runtime.dispatch('pageshow')
  assert.equal(resumeRequests, 1)
  assert.equal(resumeMetaEmbeddedSignup(), true)
  assert.equal(callbacks.length, 2)

  callbacks[0]({authResponse:{code:'late-obsolete-code'}})
  send(messageListeners, {
    type:'WA_EMBEDDED_SIGNUP', event:'FINISH',
    data:{waba_id:'333333333333333'},
  })
  let settled = false
  void pending.then(() => { settled = true })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(settled, false)

  callbacks[1]({authResponse:{code:'current-resume-code'}})
  assert.deepEqual(await pending, {
    authorization_code:'current-resume-code',
    waba_id:'333333333333333',
  })
})

test('retomada fica vinculada ao tenant que iniciou a tentativa', async () => {
  let loginCalls = 0
  const runtime = runtimeFor(({callback}) => {
    loginCalls++
    callback({})
  }, {clock:passiveClock})
  const pending = launchMetaEmbeddedSignup(configuration, runtime, {
    attemptKey:'business-a',
    onResumeRequired: () => {},
  })
  await new Promise(resolve => setImmediate(resolve))
  runtime.dispatch('pageshow')

  assert.equal(resumeMetaEmbeddedSignup('business-b'), false)
  assert.equal(loginCalls, 1)
  assert.equal(cancelMetaEmbeddedSignup('business-b'), false)
  assert.equal(cancelMetaEmbeddedSignup('business-a'), true)
  await assert.rejects(pending, EmbeddedSignupCancelledError)
})

test('SessionInfo e callback duplicados são idempotentes e preservam o primeiro código', async () => {
  const runtime = runtimeFor(({listeners, callback}) => {
    send(listeners, {
      type:'WA_EMBEDDED_SIGNUP', event:'FINISH',
      data:{waba_id:'333333333333333'},
    })
    send(listeners, {
      type:'WA_EMBEDDED_SIGNUP', event:'FINISH',
      data:{waba_id:'333333333333333'},
    })
    callback({authResponse:{code:'first-code'}})
    callback({authResponse:{code:'duplicate-code'}})
  })

  assert.deepEqual(await launchMetaEmbeddedSignup(configuration, runtime), {
    authorization_code:'first-code',
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

test('falha de complete é sanitizada e observada sem resposta interna', async () => {
  const observations = []
  const phases = []
  const run = createEmbeddedSignupRunner({
    start: () => configuration,
    launch: async () => ({authorization_code:'code', waba_id:'333333333333333'}),
    complete: async () => { throw new Error('private Meta response') },
    onPhase: (phase, error) => phases.push([phase,error?.message]),
    onConnected: async () => {},
    onObservation: observation => observations.push(observation.stage),
  })

  await assert.rejects(run(), error => {
    assert.equal(error instanceof EmbeddedSignupError, true)
    assert.equal(error.message.includes('private Meta response'), false)
    return true
  })
  assert.deepEqual(observations, ['complete_request_started', 'complete_request_failed'])
  assert.equal(JSON.stringify(phases).includes('private Meta response'), false)
})
