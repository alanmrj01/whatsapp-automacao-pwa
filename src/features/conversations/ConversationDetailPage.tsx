import { ArrowLeft, Bot, CalendarPlus2, Check, CheckCheck, Copy, Info, Pencil, Pin, PinOff, Send, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BottomSheet } from '../../components/BottomSheet'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { useAuth } from '../auth/useAuth'
import {
  useDeleteConversation,
  useAddAssistantExclusion,
  useAssistantExclusions,
  useBusiness,
  useConversation,
  useRemoveAssistantExclusion,
  useSendConversationMessage,
  useSetConversationPinned,
  useSetConversationRead,
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
  const navigate=useNavigate()
  const {membership}=useAuth()
  const detail=useConversation(conversationId||null)
  const business=useBusiness()
  const exclusions=useAssistantExclusions()
  const addExclusion=useAddAssistantExclusion()
  const removeExclusion=useRemoveAssistantExclusion()
  const rename=useUpdateCustomerName()
  const assistant=useUpdateConversationAssistant()
  const send=useSendConversationMessage()
  const pin=useSetConversationPinned()
  const read=useSetConversationRead()
  const archive=useDeleteConversation()
  const [contactOpen,setContactOpen]=useState(false)
  const [editingName,setEditingName]=useState(false)
  const [confirmDelete,setConfirmDelete]=useState(false)
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

  useEffect(()=>{
    if(!canMutate||!detail.data||detail.data.unread_count<=0||read.isPending)return
    read.mutate({id:detail.data.id,read:true})
  // Deliberately react only to the unread count of the opened conversation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[canMutate,detail.data?.id,detail.data?.unread_count])

  if(detail.isPending||business.isPending)return <div className="conversation-detail-page conversation-detail-page--state"><LoadingState/></div>
  if(detail.isError||business.isError||!detail.data)return <div className="conversation-detail-page conversation-detail-page--state"><ErrorState onRetry={()=>{void detail.refetch();void business.refetch()}}/></div>
  const conversation=detail.data
  const whatsappId=(conversation.customer_phone??'').replace(/\D/g,'')
  const permanentExclusion=exclusions.data?.items.find(item=>item.whatsapp_id===whatsappId)

  const submitMessage=()=>{
    const normalized=text.trim()
    if(!normalized||!canMutate||!conversation.free_form_window_open||send.isPending)return
    send.mutate(
      {id:conversation.id,text:normalized,idempotencyKey},
      {onSuccess:()=>{setText('');setIdempotencyKey(crypto.randomUUID())}},
    )
  }

  const openContact=()=>{
    setName(conversation.customer_name)
    setEditingName(false)
    setConfirmDelete(false)
    setContactOpen(true)
  }

  const saveName=()=>rename.mutate(
    {id:conversation.id,name:name.trim()||null},
    {onSuccess:()=>setEditingName(false)},
  )

  const createAppointment=()=>{
    setContactOpen(false)
    const params=new URLSearchParams({action:'new',customer:conversation.customer_id})
    navigate(`/app/agenda?${params}`)
  }

  return <div className="conversation-detail-page">
    <header className="conversation-detail-header">
      <Link className="conversation-header-action" to="/app/conversas" aria-label="Voltar para conversas" title="Voltar">
        <ArrowLeft size={22}/>
      </Link>

      <button className="conversation-contact-avatar-button" type="button" onClick={openContact} aria-label="Abrir dados do contato">
        <span className="conversation-avatar conversation-detail-avatar" aria-hidden="true">
          {initials(conversation.customer_name)}
        </span>
      </button>

      <button className="conversation-detail-header__identity" type="button" onClick={openContact} aria-label="Abrir dados do contato">
        <strong>{conversation.customer_name}</strong>
        <span>{conversation.customer_phone??'Contato do WhatsApp'}</span>
        <small>{conversationStatusLabels[conversation.status]}</small>
      </button>

      <div className="conversation-detail-header__actions" aria-label="Ações da conversa">
        <button
          type="button"
          className="conversation-header-action"
          aria-label="Dados do contato"
          title="Dados do contato"
          onClick={openContact}
        ><Info size={20}/></button>
      </div>
    </header>

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

    <BottomSheet
      open={contactOpen}
      title={confirmDelete?'Excluir conversa':'Dados do contato'}
      description={confirmDelete?'O histórico será preservado e a conversa volta à lista se o contato enviar uma nova mensagem.':'Gerencie o contato e as ações desta conversa.'}
      onClose={()=>{setContactOpen(false);setEditingName(false);setConfirmDelete(false)}}
    >
      {confirmDelete ? <div className="conversation-contact-delete">
        <div className="conversation-contact-delete__warning"><Trash2 size={22}/><div><strong>Excluir {conversation.customer_name} da lista?</strong><span>Essa ação não apaga as mensagens armazenadas.</span></div></div>
        {archive.isError&&<p className="form-error" role="alert">Não foi possível excluir a conversa.</p>}
        <div className="conversation-contact-delete__actions">
          <button className="secondary-button" type="button" onClick={()=>setConfirmDelete(false)}>Cancelar</button>
          <button className="danger-button" type="button" disabled={archive.isPending} onClick={()=>archive.mutate(conversation.id,{onSuccess:()=>navigate('/app/conversas',{replace:true})})}>{archive.isPending?'Excluindo…':'Excluir conversa'}</button>
        </div>
      </div> : <div className="conversation-contact-sheet">
        <section className="conversation-contact-profile">
          <div className="conversation-avatar conversation-contact-profile__avatar" aria-hidden="true">{initials(conversation.customer_name)}</div>
          <strong>{conversation.customer_name}</strong>
          <span>{conversation.customer_phone??'Número não informado'}</span>
          <small>{conversationStatusLabels[conversation.status]}</small>
        </section>

        <div className="conversation-contact-quick-actions" aria-label="Ações rápidas">
          <button type="button" onClick={createAppointment}><CalendarPlus2/><span>Agendar</span></button>
          <button type="button" disabled={!canMutate||pin.isPending} onClick={()=>pin.mutate({id:conversation.id,pinned:!conversation.pinned})}>{conversation.pinned?<PinOff/>:<Pin/>}<span>{conversation.pinned?'Desafixar':'Fixar'}</span></button>
          <button type="button" disabled={!canMutate||read.isPending} onClick={()=>read.mutate({id:conversation.id,read:conversation.unread_count>0})}><CheckCheck/><span>{conversation.unread_count>0?'Marcar lida':'Não lida'}</span></button>
        </div>

        <section className="conversation-contact-section">
          <h3>Contato</h3>
          {editingName ? <form className="conversation-contact-name-form" onSubmit={event=>{event.preventDefault();saveName()}}>
            <label>Nome<input maxLength={255} value={name} onChange={event=>setName(event.target.value)} autoFocus/></label>
            <div><button className="secondary-button" type="button" onClick={()=>setEditingName(false)}>Cancelar</button><button className="primary-button" disabled={rename.isPending}>Salvar</button></div>
          </form> : <button className="conversation-contact-row" type="button" disabled={!canMutate} onClick={()=>{setName(conversation.customer_name);setEditingName(true)}}><div><span>Nome</span><strong>{conversation.customer_name}</strong></div><Pencil size={18}/></button>}
          <div className="conversation-contact-row is-static"><div><span>WhatsApp</span><strong>{conversation.customer_phone??'Não informado'}</strong></div></div>
          {rename.isError&&<p className="form-error" role="alert">Não foi possível alterar o nome.</p>}
        </section>

        <section className="conversation-contact-section">
          <h3>Atendimento</h3>
          <button className="conversation-contact-row" type="button" disabled={!canMutate||assistant.isPending} onClick={()=>assistant.mutate({id:conversation.id,enabled:!conversation.assistant_enabled})}>
            <div><span>Assistente nesta conversa</span><strong>{conversation.assistant_enabled?'Ativo':'Pausado temporariamente'}</strong></div>
            <Bot size={19}/>
          </button>
          <button className="conversation-contact-row" type="button" disabled={!canMutate||!whatsappId||addExclusion.isPending||removeExclusion.isPending||exclusions.isPending} onClick={()=>{
            if(permanentExclusion){
              removeExclusion.mutate(permanentExclusion.id)
            }else{
              addExclusion.mutate({whatsapp_id:whatsappId,label:conversation.customer_name,reason:'Definido pela conversa',mode:'human_only'})
            }
          }}>
            <div><span>Respostas automáticas permanentes</span><strong>{permanentExclusion?'Nunca responder automaticamente':'Permitidas para este contato'}</strong></div>
            <Bot size={19}/>
          </button>
          {(assistant.isError||addExclusion.isError||removeExclusion.isError||exclusions.isError)&&<p className="form-error" role="alert">Não foi possível alterar o Assistente Virtual.</p>}
        </section>

        <button className="conversation-contact-danger" type="button" disabled={!canMutate} onClick={()=>setConfirmDelete(true)}><Trash2 size={18}/>Excluir conversa</button>
      </div>}
    </BottomSheet>
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
