import { ArrowLeft, Bot, Check, Copy, Pencil, Send, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { StatusBadge } from '../../components/StatusBadge'
import { useAuth } from '../auth/useAuth'
import {
  useBusiness,
  useConversation,
  useSendConversationMessage,
  useUpdateConversationAssistant,
  useUpdateCustomerName,
} from '../operations/api'
import type { ConversationMessage } from '../operations/types'

const statusLabels = {waiting:'Aguardando',in_progress:'Em atendimento',answered:'Respondida'} as const

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
  const canMutate=membership?.access_mode==='paid'&&membership.role!=='viewer'
  const timezone=business.data?.timezone

  const orderedMessages=useMemo(
    ()=>detail.data?.messages??[],
    [detail.data?.messages],
  )

  if(detail.isPending||business.isPending)return <div className="page-stack conversation-detail-page"><LoadingState/></div>
  if(detail.isError||business.isError||!detail.data)return <div className="page-stack conversation-detail-page"><ErrorState onRetry={()=>{void detail.refetch();void business.refetch()}}/></div>
  const conversation=detail.data

  const submitMessage=()=>{
    const normalized=text.trim()
    if(!normalized||!canMutate||!conversation.free_form_window_open)return
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
      <Link className="icon-action" to="/app/conversas" aria-label="Voltar para conversas"><ArrowLeft/></Link>
      <div className="conversation-detail-header__identity">
        <strong>{conversation.customer_name}</strong>
        <span>{conversation.customer_phone??'Contato do WhatsApp'}</span>
      </div>
      <StatusBadge tone={conversation.status==='waiting'?'warning':conversation.status==='answered'?'success':'info'}>{statusLabels[conversation.status]}</StatusBadge>
    </header>

    <section className="conversation-contact-actions" aria-label="Controles da conversa">
      <span><UserRound size={16}/>{conversation.assignee_name??'Sem responsável'}</span>
      {canMutate&&<button type="button" className="compact-button" onClick={()=>{setName(conversation.customer_name);setEditingName(value=>!value)}}><Pencil size={16}/>Editar nome</button>}
      {canMutate&&<button type="button" className="compact-button" disabled={assistant.isPending} onClick={()=>assistant.mutate({id:conversation.id,enabled:!conversation.assistant_enabled})}><Bot size={16}/>{conversation.assistant_enabled?'Pausar Assistente Virtual':'Reativar Assistente Virtual'}</button>}
    </section>
    {editingName&&<form className="conversation-name-form" onSubmit={event=>{event.preventDefault();saveName()}}><label>Novo nome<input maxLength={255} value={name} onChange={event=>setName(event.target.value)}/></label><button className="primary-button" disabled={rename.isPending}>Salvar</button></form>}
    {(rename.isError||assistant.isError)&&<p className="form-error" role="alert">Não foi possível salvar. Tente novamente.</p>}

    <main className="conversation-thread" aria-live="polite">
      {orderedMessages.map(message=><MessageBubble message={message} timezone={timezone} copied={copiedId===message.id} onCopy={async()=>{if(!message.body)return;try{await navigator.clipboard.writeText(message.body);setCopiedId(message.id);window.setTimeout(()=>setCopiedId(null),1500)}catch{setCopiedId(null)}}} key={message.id}/>) }
    </main>

    <footer className="conversation-composer">
      {!conversation.free_form_window_open&&<p className="conversation-window-warning" role="status">A janela de atendimento está encerrada. Para iniciar novo contato, use uma mensagem template aprovada.</p>}
      <div className="conversation-composer__row">
        <label><span className="sr-only">Responder conversa</span><textarea maxLength={4096} rows={1} value={text} disabled={!canMutate||!conversation.free_form_window_open||send.isPending} onChange={event=>setText(event.target.value)} placeholder={canMutate?'Escreva uma mensagem':'Somente leitura'}/></label>
        <button type="button" className="composer-send" aria-label="Enviar mensagem" disabled={!text.trim()||!canMutate||!conversation.free_form_window_open||send.isPending} onClick={submitMessage}><Send/></button>
      </div>
      {send.isError&&<p className="form-error" role="alert">Não foi possível enviar agora. Tente novamente.</p>}
    </footer>
  </div>
}

function MessageBubble({message,timezone,copied,onCopy}:{message:ConversationMessage;timezone?:string;copied:boolean;onCopy:()=>void}) {
  return <article className={`conversation-bubble conversation-bubble--${message.direction}`}>
    <p>{message.body??`Mensagem ${message.message_type}`}</p>
    <footer><time>{new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',timeZone:timezone}).format(new Date(message.created_at))}</time>{message.direction==='outbound'&&<span>{message.status}</span>}{message.body&&<button type="button" onClick={onCopy} aria-label="Copiar mensagem">{copied?<Check size={14}/>:<Copy size={14}/>}</button>}</footer>
  </article>
}
