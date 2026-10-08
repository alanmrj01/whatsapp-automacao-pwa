import { Bell, Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEntitlements } from '../access/useEntitlements'
import { useConversations, useMarkNotificationRead, useNotifications } from '../operations/api'
import type { OperationalNotification } from '../operations/types'
import { useWebPush } from './useWebPush'

export function NotificationCenter({backgroundOnly=false}:{backgroundOnly?:boolean}){
  const entitlement=useEntitlements()
  const notifications=useNotifications(false)
  const conversations=useConversations('','')
  const markRead=useMarkNotificationRead()
  const navigate=useNavigate()
  const [open,setOpen]=useState(false)
  const webPush=useWebPush()
  const permissionPrompted=useRef(false)
  const items=notifications.data?.items??[]
  const unreadItems=items.filter(item=>!item.read)
  const unreadCount=unreadItems.length
  const unreadMessages=(conversations.data?.items??[]).reduce((total,item)=>total+item.unread_count,0)

  useEffect(()=>{
    if(webPush.state!=='default'||backgroundOnly||permissionPrompted.current)return
    permissionPrompted.current=true
    const timer=window.setTimeout(()=>setOpen(true),1200)
    return()=>window.clearTimeout(timer)
  },[backgroundOnly,webPush.state])

  useEffect(()=>{
    if(!webPush.actionPush)return
    const timer=window.setTimeout(()=>webPush.clearActionPush(),7000)
    return()=>window.clearTimeout(timer)
  },[webPush.actionPush,webPush.clearActionPush])

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

  const openActionAlert=()=>{
    const alert=webPush.actionPush
    if(!alert)return
    webPush.clearActionPush()
    navigate(safeTarget(alert.target_path))
  }

  const actionToast=webPush.actionPush
    ? <button className="notification-toast" type="button" onClick={openActionAlert}>
        <strong>{webPush.actionPush.title}</strong>
        <span>{webPush.actionPush.body}</span>
      </button>
    : null

  if(backgroundOnly)return actionToast

  return <div className="notification-center">
    <button className="notification-center__trigger" type="button" aria-label={unreadCount?`Notificações — ${unreadCount} não lida(s)`:'Notificações'} aria-expanded={open} onClick={()=>{
      const next=!open
      setOpen(next)
      if(next&&entitlement.canMutateOperationalData&&unreadItems.length){
        void Promise.allSettled(unreadItems.map(item=>markRead.mutateAsync(item.id)))
      }
    }}>
      <Bell size={21}/>
      {unreadCount>0&&<i className="notification-unread-dot" aria-hidden="true"/>}
      {unreadCount>0&&<span>{unreadCount>99?'99+':unreadCount}</span>}
    </button>
    {open&&<section className="notification-center__panel" aria-label="Notificações recentes">
      <header><strong>Notificações</strong><button type="button" onClick={()=>setOpen(false)} aria-label="Fechar notificações">×</button></header>
      {notifications.isPending&&<p>Atualizando…</p>}
      {notifications.isError&&<p className="form-error" role="alert">Não foi possível atualizar as notificações.</p>}
      {markRead.isError&&<p className="form-error" role="alert">Não foi possível marcar a notificação como lida.</p>}
      {unreadMessages>0&&<p className="notification-message-summary">{unreadMessages} mensagem(ns) não lida(s) nas conversas.</p>}
      {!notifications.isPending&&!notifications.isError&&!items.length&&unreadMessages===0&&<p>Nenhuma notificação recente.</p>}
      {items.map(item=><button className="notification-center__item" type="button" key={item.id} disabled={markRead.isPending} onClick={()=>void openItem(item)}><span><strong>{item.title}</strong><small>{item.body}</small></span>{entitlement.canMutateOperationalData&&<Check size={17}/>}</button>)}
      {webPush.state==='default'&&<div className="notification-permission-callout">
        <strong>Ative os alertas importantes</strong>
        <small>A Alovia só envia um popup quando você precisa fazer alguma coisa, como assumir um atendimento, resolver um pagamento ou concluir uma etapa da conexão do WhatsApp.</small>
        <button className="compact-button" type="button" disabled={webPush.busy} onClick={()=>void webPush.enable()}>Ativar alertas importantes</button>
      </div>}
      {webPush.state==='active'&&<div className="notification-permission-callout"><strong>Alertas importantes ativos</strong><small>Este aparelho receberá avisos quando sua intervenção for necessária.</small><button className="compact-button" type="button" disabled={webPush.busy} onClick={()=>void webPush.disable()}>Desativar neste aparelho</button></div>}
      {webPush.state==='denied'&&<small>As notificações do aparelho estão bloqueadas. Você pode reativá-las nas configurações do navegador ou do sistema.</small>}
      {webPush.state==='unsupported'&&<small>Este navegador não oferece suporte a notificações em segundo plano.</small>}
      {webPush.state==='error'&&<small>Não foi possível atualizar os alertas deste aparelho. Tente novamente.</small>}
    </section>}
    {actionToast}
  </div>
}

function safeTarget(value:string){return value.startsWith('/app/')?value:'/app'}
