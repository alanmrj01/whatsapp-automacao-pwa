import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'

const source=readFileSync(new URL('../public/push-sw.js',import.meta.url),'utf8')

function workerHarness(openClients=[]){
  const listeners={}
  const notifications=[]
  const opened=[]
  const self={
    location:{origin:'https://alovia.test'},
    registration:{showNotification:async(title,options)=>notifications.push({title,options})},
    addEventListener:(name,listener)=>{listeners[name]=listener},
  }
  const clients={
    matchAll:async()=>openClients,
    openWindow:async url=>{opened.push(url)},
  }
  vm.runInNewContext(source,{self,clients,URL})
  return{listeners,notifications,opened}
}

async function dispatch(listener,event){
  let pending=Promise.resolve()
  listener({...event,waitUntil:value=>{pending=Promise.resolve(value)}})
  await pending
}

test('closed app receives a safe user-visible notification',async()=>{
  const harness=workerHarness()
  await dispatch(harness.listeners.push,{
    data:{json:()=>({
      event_id:'event-1',title:'Nova mensagem no Alovia',
      body:'Você recebeu uma nova mensagem.',
      target_path:'/app/conversas/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    })},
  })
  assert.equal(harness.notifications.length,1)
  assert.equal(harness.notifications[0].options.data.target_path,'/app/conversas/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
})

test('open app receives one lightweight refresh signal instead of a duplicate notification',async()=>{
  const messages=[]
  const harness=workerHarness([{visibilityState:'visible',postMessage:value=>messages.push(value)}])
  await dispatch(harness.listeners.push,{
    data:{json:()=>({title:'Novo agendamento automático',body:'Um novo agendamento foi confirmado.',target_path:'/app/agenda'})},
  })
  assert.equal(harness.notifications.length,0)
  assert.equal(messages.length,1)
  assert.equal(messages[0].type,'ALOVIA_WEB_PUSH_EVENT')
  assert.equal(messages[0].target_path,'/app/agenda')
})

test('background app receives refresh signal and a system notification',async()=>{
  const messages=[]
  const harness=workerHarness([{visibilityState:'hidden',postMessage:value=>messages.push(value)}])
  await dispatch(harness.listeners.push,{
    data:{json:()=>({title:'Novo agendamento automático',body:'Um novo agendamento foi confirmado.',target_path:'/app/agenda'})},
  })
  assert.equal(messages.length,1)
  assert.equal(harness.notifications.length,1)
})

test('notification click opens only an allowlisted authenticated route',async()=>{
  const harness=workerHarness()
  await dispatch(harness.listeners.notificationclick,{
    notification:{data:{target_path:'https://evil.test'},close(){}},
  })
  assert.deepEqual(harness.opened,['https://alovia.test/app'])
})

test('browser source contains no VAPID private key or subscription persistence',()=>{
  const client=readFileSync(new URL('../src/features/notifications/webPush.ts',import.meta.url),'utf8')
  assert.doesNotMatch(client,/VAPID_PRIVATE_KEY|vapid_private_key/i)
  assert.doesNotMatch(client,/localStorage|sessionStorage|indexedDB/)
})
