import { ArrowLeft, Bot, Check, Copy, Pencil, Send } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { useAuth } from '../auth/useAuth'
import {
  useBusiness,
  useConversation,
  useSendConversationMessage,
  useUpdateConversationAssistant,
  useUpdateCustomerName,
} from '../operations/api'
import type { ConversationMessage } from '../operations/types'
import './conversation-detail.css'

const conversationStatusLabels = {
  waiting:'Aguardando atendimento',
  in_progress:'Em atendimento',
  answered:'Respondida',
} as const

const outboundStatusLabels: Record<string,string> = {
  pending:'Aguardando envio',
  queued:'Aguardando envio',
  sent:'Enviada',
  delivered:'Entregue',
  read:'Lida',
  failed:'Não enviada',
}

export function ConversationDetailPage() {
  const {conversationId=''}=useParams()
  const {membership}=useAuth()
  const detail=useConversation(conversationId||null)
  const business=useBusiness()
  const rename=useUpdateCustomerName()
  const assistant=useUpdateConversationAssistant()
  const send=useSendConversationMessage()
  const [editingName,setEditingName]=useState(false)
  const [name,setName]=useState('')
  const [text,setText]=useState('')
  const [idempotencyKey,setIdempotencyKey]=useState(()=>crypto.randomUUID())
  const [copiedId,setCopiedId]=useState<string|null>(null)
  const threadEndRef=useRef<HTMLDivElement|null>(null)
  const canMutate=membership?.access_mode==='paid'&&membership.role!=='viewer'
  const timezone=business.data?.timezone

  const orderedMessages=useMemo(
    ()=>detail.data?.messages??[],
    [detail.data?.messages],
  )

  useEffect(()=>{
    threadEndRef.current?.scrollIntoView({block:'end'})
  },[orderedMessages.length])

  if(detail.isPending||business.isPending)return <div className="conversation-detail-page conversation-detail-page--state"><LoadingState/></div>
  if(detail.isError||business.isError||!detail.data)return <div className="conversation-detail-page conversation-detail-page--state"><ErrorState onRetry={()=>{void detail.refetch();void business.refetch()}}/></div>
  const conversation=detail.data

  const submitMessage=()=>{
    const normalized=text.trim()
    if(!normalized||!canMutate||!conversation.free_form_window_open||send.isPending)return
    send.mutate(
      {id:conversation.id,text:normalized,idempotencyKey},
      {onSuccess:()=>{setText('');setIdempotencyKey(crypto.randomUUID())}},
    )
  }
  const saveName=()=>rename.mutate(
    {id:conversation.id,name:name.trim()||null},
    {onSuccess:()=>setEditingName(false)},
  )

  return <div className="conversation-detail-page">
    <header className="conversation-detail-header">
      <Link className="conversation-header-action" to="/app/conversas" aria-label="Voltar para conversas" title="Voltar">
        <ArrowLeft size={22}/>
      </Link>

      <div className="conversation-avatar conversation-detail-avatar" aria-hidden="true">
        {initials(conversation.customer_name)}
      </div>

      <div className="conversation-detail-header__identity">
        <strong>{conversation.customer_name}</strong>
        <span>{conversation.customer_phone??'Contato do WhatsApp'}</span>
        <small>{conversationStatusLabels[conversation.status]}</small>
      </div>

      <div className="conversation-detail-header__actions" aria-label="Ações da conversa">
        {canMutate&&<button
          type="button"
          className="conversation-header-action"
          aria-label="Editar nome do contato"
          title="Editar nome"
          onClick={()=>{setName(conversation.customer_name);setEditingName(value=>!value)}}
        ><Pencil size={19}/></button>}
        {canMutate&&<button
          type="button"
          className={`conversation-header-action ${conversation.assistant_enabled?'is-active':''}`}
          aria-label={conversation.assistant_enabled?'Pausar Assistente Virtual':'Reativar Assistente Virtual'}
          title={conversation.assistant_enabled?'Pausar Assistente Virtual':'Reativar Assistente Virtual'}
          disabled={assistant.isPending}
          onClick={()=>assistant.mutate({id:conversation.id,enabled:!conversation.assistant_enabled})}
        ><Bot size={20}/></button>}
      </div>
    </header>

    {editingName&&<form className="conversation-name-form conversation-name-form--messenger" onSubmit={event=>{event.preventDefault();saveName()}}>
      <label>Novo nome<input maxLength={255} value={name} onChange={event=>setName(event.target.value)} autoFocus/></label>
      <button className="primary-button" disabled={rename.isPending}>Salvar</button>
    </form>}

    {(rename.isError||assistant.isError)&&<p className="form-error conversation-inline-error" role="alert">Não foi possível salvar a alteração. Tente novamente.</p>}

    <main className="conversation-thread" aria-live="polite" aria-label="Histórico da conversa">
      {orderedMessages.map(message=><MessageBubble
        message={message}
        timezone={timezone}
        copied={copiedId===message.id}
        onCopy={async()=>{
          if(!message.body)return
          try{
            await navigator.clipboard.writeText(message.body)
            setCopiedId(message.id)
            window.setTimeout(()=>setCopiedId(null),1500)
          }catch{
            setCopiedId(null)
          }
        }}
        key={message.id}
      />)}
      <div ref={threadEndRef} aria-hidden="true"/>
    </main>

    <footer className="conversation-composer">
      {!conversation.free_form_window_open&&<p className="conversation-window-warning" role="status">A janela de atendimento está encerrada. Para iniciar novo contato, use uma mensagem template aprovada.</p>}
      <div className="conversation-composer__row">
        <label>
          <span className="sr-only">Responder conversa</span>
          <textarea
            maxLength={4096}
            rows={1}
            value={text}
            disabled={!canMutate||!conversation.free_form_window_open||send.isPending}
            onChange={event=>setText(event.target.value)}
            onKeyDown={event=>{
              if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing){
                event.preventDefault()
                submitMessage()
              }
            }}
            placeholder={canMutate?'Escreva uma mensagem':'Somente leitura'}
          />
        </label>
        <button
          type="button"
          className="composer-send"
          aria-label="Enviar mensagem"
          disabled={!text.trim()||!canMutate||!conversation.free_form_window_open||send.isPending}
          onClick={submitMessage}
        ><Send size={20}/></button>
      </div>
      {send.isError&&<p className="form-error conversation-send-error" role="alert">Não foi possível confirmar o envio. O histórico foi atualizado; verifique o status da mensagem antes de tentar novamente.</p>}
    </footer>
  </div>
}

function MessageBubble({message,timezone,copied,onCopy}:{message:ConversationMessage;timezone?:string;copied:boolean;onCopy:()=>void}) {
  const status = outboundStatusLabels[message.status.toLocaleLowerCase('pt-BR')]??message.status
  return <article className={`conversation-bubble conversation-bubble--${message.direction}`}>
    <p>{message.body??`Mensagem ${message.message_type}`}</p>
    <footer>
      <time>{new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:timezone}).format(new Date(message.created_at))}</time>
      {message.direction==='outbound'&&<span className={`conversation-delivery-status conversation-delivery-status--${message.status}`}>{status}</span>}
      {message.body&&<button type="button" onClick={onCopy} aria-label="Copiar mensagem" title="Copiar mensagem">{copied?<Check size={14}/>:<Copy size={14}/>}</button>}
    </footer>
  </article>
}

function initials(name:string) {
  return name.trim().split(/\s+/).slice(0,2).map(part=>part[0]??'').join('').toUpperCase()||'?'
}
