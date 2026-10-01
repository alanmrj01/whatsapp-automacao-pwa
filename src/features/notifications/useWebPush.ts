import { useCallback, useEffect, useState } from 'react'
import { queryClient } from '../../app/queryClient'
import { useEntitlements } from '../access/useEntitlements'
import { useAuth } from '../auth/useAuth'
import {
  currentPushSubscription,
  disableWebPush,
  enableWebPush,
  fetchWebPushConfig,
  registerExistingSubscription,
  supportsWebPush,
  type WebPushConfig,
} from './webPush'

export type WebPushState='loading'|'unsupported'|'disabled'|'default'|'denied'|'active'|'error'

export function useWebPush(){
  const entitlement=useEntitlements()
  const businessId=useAuth().membership?.business_id
  const [state,setState]=useState<WebPushState>('loading')
  const [config,setConfig]=useState<WebPushConfig|null>(null)
  const [busy,setBusy]=useState(false)

  const refresh=useCallback(async()=>{
    if(!entitlement.canReadOperationalData||!businessId){setState('disabled');return}
    if(!supportsWebPush()){setState('unsupported');return}
    try{
      const nextConfig=await fetchWebPushConfig()
      setConfig(nextConfig)
      if(!nextConfig.enabled||!nextConfig.public_key){setState('disabled');return}
      const subscription=await currentPushSubscription()
      if(Notification.permission==='granted'&&subscription){
        await registerExistingSubscription(subscription)
        setState('active')
      }else{
        setState(Notification.permission==='denied'?'denied':'default')
      }
    }catch{setState('error')}
  },[businessId,entitlement.canReadOperationalData])

  // The effect synchronizes authenticated tenant state with the browser Push API.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(()=>{void refresh()},[refresh])

  useEffect(()=>{
    if(!('serviceWorker' in navigator)||!businessId)return
    const receive=(event:MessageEvent)=>{
      if(event.data?.type!=='ALOVIA_WEB_PUSH_EVENT')return
      void queryClient.invalidateQueries({queryKey:['operations',businessId]})
    }
    navigator.serviceWorker.addEventListener('message',receive)
    return()=>navigator.serviceWorker.removeEventListener('message',receive)
  },[businessId])

  const enable=useCallback(async()=>{
    if(!config?.public_key)return
    setBusy(true)
    try{
      const result=await enableWebPush(config.public_key)
      setState(result.subscribed?'active':result.permission==='denied'?'denied':'default')
    }catch{setState('error')}
    finally{setBusy(false)}
  },[config])

  const disable=useCallback(async()=>{
    setBusy(true)
    try{await disableWebPush();setState(Notification.permission==='denied'?'denied':'default')}
    catch{setState('error')}
    finally{setBusy(false)}
  },[])

  return{state,busy,enable,disable,refresh}
}
