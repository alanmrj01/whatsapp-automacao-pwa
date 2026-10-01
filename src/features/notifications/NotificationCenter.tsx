import { Bell, BellRing, Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEntitlements } from '../access/useEntitlements'
import { useAuth } from '../auth/useAuth'
import { useConversations, useMarkNotificationRead, useNotifications } from '../operations/api'
import type { OperationalNotification } from '../operations/types'
import { useWebPush } from './useWebPush'

export function NotificationCenter({backgroundOnly=false}:{backgroundOnly?:boolean}){
  const entitlement=useEntitlements()
  const businessId=useAuth().membership?.business_id
  const notifications=useNotifications(true)
  const conversations=useConversations('','')
  const markRead=useMarkNotificationRead()
  const navigate=useNavigate()
  const [open,setOpen]=useState(false)
  const [latest,setLatest]=useState<OperationalNotification|null>(null)
  const webPush=useWebPush()
  const knownIds=useRef<Set<string>|null>(null)
  const permissionPrompted=useRef(false)
  const notificationItems=notifications.data?.items
  const items=notificationItems??[]
  const unreadMessages=(conversations.data?.items??[]).reduce((total,item)=>total+item.unread_count,0)

  useEffect(()=>{knownIds.current=null},[businessId])

  useEffect(()=>{
    if(webPush.state!=='default'||backgroundOnly||permissionPrompted.current)return
    permissionPrompted.current=true
    const timer=window.setTimeout(()=>setOpen(true),1200)
    return ()=>window.clearTimeout(timer)
  },[backgroundOnly,businessId,webPush.state])

  useEffect(()=>{
    if(!notificationItems)return
    if(knownIds.current===null){knownIds.current=new Set(notificationItems.map(item=>item.id));return}
    const fresh=notificationItems.filter(item=>!knownIds.current?.has(item.id))
    notificationItems.forEach(item=>knownIds.current?.add(item.id))
    const newest=fresh[0]
    if(!newest)return
    setLatest(newest)
  },[notificationItems])

  useEffect(()=>{
    if(!latest)return
    const timer=window.setTimeout(()=>setLatest(null),6000)
    return ()=>window.clearTimeout(timer)
  },[latest])

  if(!entitlement.canReadOperationalData)return null
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
      {webPush.state==='default'&&<div className="notification-permission-callout"><strong>Ative os alertas do navegador</strong><small>Receba avisos de novas mensagens e agendamentos mesmo com o Alovia fechado.</small><button className="compact-button" type="button" disabled={webPush.busy} onClick={()=>void webPush.enable()}>Permitir notificações</button></div>}
      {webPush.state==='active'&&<div className="notification-permission-callout"><strong>Alertas em segundo plano ativos</strong><small>Este aparelho receberá avisos seguros desta empresa.</small><button className="compact-button" type="button" disabled={webPush.busy} onClick={()=>void webPush.disable()}>Desativar neste aparelho</button></div>}
      {webPush.state==='denied'&&<small>As notificações do aparelho estão bloqueadas. Você pode reativá-las nas configurações do navegador ou do sistema.</small>}
      {webPush.state==='unsupported'&&<small>Este navegador não oferece suporte a notificações em segundo plano.</small>}
      {webPush.state==='error'&&<small>Não foi possível atualizar os alertas deste aparelho. Tente novamente.</small>}
    </section>}
    {latest&&<button className="notification-toast" type="button" onClick={()=>void openItem(latest)}><strong>{latest.title}</strong><span>{latest.body}</span></button>}
  </div>
}

function safeTarget(value:string){return value.startsWith('/app/')?value:'/app/agenda'}
