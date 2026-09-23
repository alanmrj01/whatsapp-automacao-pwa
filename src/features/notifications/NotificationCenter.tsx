import { Bell, BellRing, Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEntitlements } from '../access/useEntitlements'
import { useAuth } from '../auth/useAuth'
import { useMarkNotificationRead, useNotifications } from '../operations/api'
import type { OperationalNotification } from '../operations/types'

export function NotificationCenter({backgroundOnly=false}:{backgroundOnly?:boolean}){
  const entitlement=useEntitlements()
  const businessId=useAuth().membership?.business_id
  const notifications=useNotifications(true)
  const markRead=useMarkNotificationRead()
  const navigate=useNavigate()
  const [open,setOpen]=useState(false)
  const [latest,setLatest]=useState<OperationalNotification|null>(null)
  const [permission,setPermission]=useState<NotificationPermission>(()=>notificationPermission())
  const knownIds=useRef<Set<string>|null>(null)
  const notificationItems=notifications.data?.items
  const items=notificationItems??[]

  useEffect(()=>{knownIds.current=null},[businessId])

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
    <button className="notification-center__trigger" type="button" aria-label="Notificações" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>
      {items.length?<BellRing size={21}/>:<Bell size={21}/>} {items.length>0&&<span>{items.length>99?'99+':items.length}</span>}
    </button>
    {open&&<section className="notification-center__panel" aria-label="Notificações recentes">
      <header><strong>Notificações</strong><button type="button" onClick={()=>setOpen(false)} aria-label="Fechar notificações">×</button></header>
      {notifications.isPending&&<p>Atualizando…</p>}
      {notifications.isError&&<p className="form-error" role="alert">Não foi possível atualizar as notificações.</p>}
      {markRead.isError&&<p className="form-error" role="alert">Não foi possível marcar a notificação como lida.</p>}
      {!notifications.isPending&&!notifications.isError&&!items.length&&<p>Nenhum agendamento novo.</p>}
      {items.map(item=><button className="notification-center__item" type="button" key={item.id} disabled={markRead.isPending} onClick={()=>void openItem(item)}><span><strong>{item.title}</strong><small>{item.body}</small></span>{entitlement.canMutateOperationalData&&<Check size={17}/>}</button>)}
      {permission==='default'&&<button className="compact-button" type="button" onClick={()=>void enableBrowserNotifications()}>Ativar alertas do navegador</button>}
      {permission==='denied'&&<small>Alertas do navegador estão bloqueados. As notificações continuam disponíveis aqui.</small>}
      <small>Alertas em segundo plano exigem infraestrutura Web Push e não estão ativos nesta versão.</small>
    </section>}
    {latest&&<button className="notification-toast" type="button" onClick={()=>void openItem(latest)}><strong>{latest.title}</strong><span>{latest.body}</span></button>}
  </div>
}

function notificationPermission():NotificationPermission{
  return typeof window!=='undefined'&&'Notification' in window?Notification.permission:'denied'
}

function safeTarget(value:string){return value.startsWith('/app/')?value:'/app/agenda'}
