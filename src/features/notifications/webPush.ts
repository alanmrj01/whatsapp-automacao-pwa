import { api } from '../../lib/api'

export type WebPushConfig = {enabled:boolean;public_key?:string|null}
export type WebPushSubscriptionPayload = {
  endpoint:string
  keys:{p256dh:string;auth:string}
}

export function supportsWebPush() {
  return typeof window !== 'undefined' && 'Notification' in window &&
    'serviceWorker' in navigator && 'PushManager' in window
}

export function vapidKeyBytes(value:string) {
  const padding='='.repeat((4-value.length%4)%4)
  const base64=(value+padding).replace(/-/g,'+').replace(/_/g,'/')
  const binary=window.atob(base64)
  return Uint8Array.from(binary,character=>character.charCodeAt(0))
}

export function subscriptionPayload(subscription:PushSubscription):WebPushSubscriptionPayload {
  const value=subscription.toJSON()
  const p256dh=value.keys?.p256dh
  const auth=value.keys?.auth
  if(!value.endpoint||!p256dh||!auth)throw new Error('Invalid PushSubscription')
  return {endpoint:value.endpoint,keys:{p256dh,auth}}
}

export async function fetchWebPushConfig() {
  return api.request<WebPushConfig>('/push/config')
}

export async function currentPushSubscription() {
  if(!supportsWebPush())return null
  return (await navigator.serviceWorker.ready).pushManager.getSubscription()
}

export async function registerExistingSubscription(subscription:PushSubscription) {
  return api.request<{subscribed:boolean}>('/push/subscriptions',{
    method:'POST',body:JSON.stringify(subscriptionPayload(subscription)),
  })
}

export async function enableWebPush(publicKey:string) {
  if(!supportsWebPush())throw new Error('Web Push unsupported')
  const permission=await Notification.requestPermission()
  if(permission!=='granted')return {permission,subscribed:false}
  const registration=await navigator.serviceWorker.ready
  const existing=await registration.pushManager.getSubscription()
  const subscription=existing??await registration.pushManager.subscribe({
    userVisibleOnly:true,
    applicationServerKey:vapidKeyBytes(publicKey),
  })
  await registerExistingSubscription(subscription)
  return {permission,subscribed:true}
}

export async function disableWebPush() {
  const subscription=await currentPushSubscription()
  if(!subscription)return
  await api.request<{subscribed:boolean}>('/push/subscriptions',{
    method:'DELETE',body:JSON.stringify(subscriptionPayload(subscription)),
  })
  await subscription.unsubscribe()
}
