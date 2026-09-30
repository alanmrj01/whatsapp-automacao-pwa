import { Bell, BellRing, Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEntitlements } from '../access/useEntitlements'
import { useAuth } from '../auth/useAuth'
import { useConversations, useMarkNotificationRead, useNotifications } from '../operations/api'
import type { OperationalNotification } from '../operations/types'

export function NotificationCenter({backgroundOnly=false}:{backgroundOnly?:boolean}){
  const entitlement=useEntitlements()
  const businessId=useAuth().membership?.business_id
  const notifications=useNotifications(true)
  const conversations=useConversations('','')
  const markRead=useMarkNotificationRead()
  const navigate=useNavigate()
  const [open,setOpen]=useState(false)
  const [latest,setLatest]=useState<OperationalNotification|null>(null)
  const [permission,setPermission]=useState<NotificationPermission>(()=>notificationPermission())
  const knownIds=useRef<Set<string>|null>(null)
  const notificationItems=notifications.data?.items
  const items=notificationItems??[]
  const unreadMessages=(conversations.data?.items??[]).reduce((total,item)=>total+item.unread_count,0)

  useEffect(()=>{knownIds.current=null},[businessId])

  useEffect(()=>{
    if(permission!=='default'||backgroundOnly)return
    const key='alovia-notification-prompt:'+(businessId??'none')
    if(window.localStorage.getItem(key)==='seen')return
    const timer=window.setTimeout(()=>{
      setOpen(true)
      window.localStorage.setItem(key,'seen')
    },1200)
    return ()=>window.clearTimeout(timer)
  },[backgroundOnly,businessId,permission])

  useEffect(()=>{
    if(!notificationItems)return
    if(knownIds.current===null){knownIds.current=new Set(notificationItems.map(item=>item.id));return}
    const fresh=notificationItems.filter(item=>!knownIds.current?.has(item.id))
    notificationItems.forEach(item=>knownIds.current?.add(item.id))
    const newest=fresh[0]
    if(!newest)return
    setLatest(newest)
    if(permission==='granted'&&document.visibilityState!=='visible'){
      const browserNotification=new Notification(newest.title,{body:newest.body,tag:newest.id})
      browserNotification.onclick=()=>{window.focus();navigate(safeTarget(newest.target_path))}
    }
  },[notificationItems,navigate,permission])

  useEffect(()=>{
    if(!latest)return
    const timer=window.setTimeout(()=>setLatest(null),6000)
    return ()=>window.clearTimeout(timer)
  },[latest])

  if(!entitlement.canReadOperationalData)return null
  const enableBrowserNotifications=async()=>{
    if(!('Notification' in window))return
    setPermission(await Notification.requestPermission())
  }
  const openItem=async(item:OperationalNotification)=>{
    try{
      if(entitlement.canMutateOperationalData)await markRead.mutateAsync(item.id)
    }catch{
      setOpen(true)
      return
    }
    setOpen(false)
    navigate(safeTarget(item.target_path))
  }

  if(backgroundOnly)return latest?<button className="notification-toast" type="button" onClick={()=>void openItem(latest)}><strong>{latest.title}</strong><span>{latest.body}</span></button>:null

  return <div className="notification-center">
    <button className="notification-center__trigger" type="button" aria-label={unreadMessages?'Notificações — '+unreadMessages+' mensagem(ns) não lida(s)':'Notificações'} aria-expanded={open} onClick={()=>setOpen(value=>!value)}>
      {items.length||unreadMessages?<BellRing size={21}/>:<Bell size={21}/>}
      {unreadMessages>0&&<i className="notification-unread-dot" aria-hidden="true"/>}
      {items.length>0&&<span>{items.length>99?'99+':items.length}</span>}
    </button>
    {open&&<section className="notification-center__panel" aria-label="Notificações recentes">
      <header><strong>Notificações</strong><button type="button" onClick={()=>setOpen(false)} aria-label="Fechar notificações">×</button></header>
      {notifications.isPending&&<p>Atualizando…</p>}
      {notifications.isError&&<p className="form-error" role="alert">Não foi possível atualizar as notificações.</p>}
      {markRead.isError&&<p className="form-error" role="alert">Não foi possível marcar a notificação como lida.</p>}
      {unreadMessages>0&&<p className="notification-message-summary">{unreadMessages} mensagem(ns) não lida(s) nas conversas.</p>}
      {!notifications.isPending&&!notifications.isError&&!items.length&&unreadMessages===0&&<p>Nenhuma notificação nova.</p>}
      {items.map(item=><button className="notification-center__item" type="button" key={item.id} disabled={markRead.isPending} onClick={()=>void openItem(item)}><span><strong>{item.title}</strong><small>{item.body}</small></span>{entitlement.canMutateOperationalData&&<Check size={17}/>}</button>)}
      {permission==='default'&&<div className="notification-permission-callout"><strong>Receba alertas mesmo fora desta tela</strong><small>Ative as notificações do aparelho para não perder novas mensagens e agendamentos.</small><button className="compact-button" type="button" onClick={()=>void enableBrowserNotifications()}>Permitir notificações</button></div>}
      {permission==='denied'&&<small>As notificações do aparelho estão bloqueadas. Você pode reativá-las nas configurações do navegador ou do sistema.</small>}
    </section>}
    {latest&&<button className="notification-toast" type="button" onClick={()=>void openItem(latest)}><strong>{latest.title}</strong><span>{latest.body}</span></button>}
  </div>
}

function notificationPermission():NotificationPermission{
  return typeof window!=='undefined'&&'Notification' in window?Notification.permission:'denied'
}

function safeTarget(value:string){return value.startsWith('/app/')?value:'/app/agenda'}
