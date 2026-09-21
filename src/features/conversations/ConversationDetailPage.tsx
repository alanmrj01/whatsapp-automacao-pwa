import { ArrowLeft, Bot, Pencil, Phone, Send } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
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
import './conversation-messenger.css'

const statusLabels = {waiting:'Aguardando',in_progress:'Em atendimento',answered:'Respondida'} as const

const outboundStatusLabels: Record<string,string> = {
  pending: 'Aguardando envio',
  sent: 'Enviada',
  delivered: 'Entregue',
  read: 'Lida',
  failed: 'Não enviada',
}

function initials(name:string) {
  const parts=name.trim().split(/\s+/).filter(Boolean)
  if(parts.length===0)return '?'
  if(parts.length===1)return parts[0].slice(0,2).toUpperCase()
  return `${parts[0][0]}${parts.at(-1)?.[0]??''}`.toUpperCase()
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
  const bottomRef=useRef<HTMLDivElement|null>(null)
  const canMutate=membership?.access_mode==='paid'&&membership.role!=='viewer'
  const timezone=business.data?.timezone

  const orderedMessages=useMemo(
    ()=>detail.data?.messages??[],
    [detail.data?.messages],
  )

  useEffect(()=>{
    bottomRef.current?.scrollIntoView({block:'end'})
  },[orderedMessages.length])

  if(detail.isPending||business.isPending)return <div className="conversation-screen-state"><LoadingState/></div>
  if(detail.isError||business.isError||!detail.data)return <div className="conversation-screen-state"><ErrorState onRetry={()=>{void detail.refetch();void business.refetch()}}/></div>

  const conversation=detail.data

  const submitMessage=()=>{
    const normalized=text.trim()
    if(!normalized||!canMutate||!conversation.free_form_window_open||send.isPending)return
    send.mutate(
      {id:conversation.id,text:normalized,idempotencyKey},
      {
        onSuccess:()=>{
          setText('')
          setIdempotencyKey(crypto.randomUUID())
        },
      },
    )
  }

  const handleComposerKeyDown=(event:KeyboardEvent<HTMLTextAreaElement>)=>{
    if(event.key!=='Enter'||event.shiftKey||event.nativeEvent.isComposing)return
    event.preventDefault()
    submitMessage()
  }

  const saveName=()=>rename.mutate(
    {id:conversation.id,name:name.trim()||null},
    {onSuccess:()=>setEditingName(false)},
  )

  return <div className="conversation-messenger">
    <header className="conversation-messenger__header">
      <Link className="conversation-messenger__back" to="/app/conversas" aria-label="Voltar para conversas">
        <ArrowLeft size={22}/>
      </Link>

      <div className="conversation-messenger__avatar" aria-hidden="true">
        {initials(conversation.customer_name)}
      </div>

      <div className="conversation-messenger__identity">
        <strong>{conversation.customer_name}</strong>
        <span>{conversation.customer_phone??'Contato do WhatsApp'}</span>
        <small>{statusLabels[conversation.status]}</small>
      </div>

      <div className="conversation-messenger__actions" aria-label="Ações da conversa">
        {conversation.customer_phone&&
          <a href={`tel:${conversation.customer_phone}`} aria-label="Ligar para cliente" title="Ligar">
            <Phone size={19}/>
          </a>
        }
        {canMutate&&
          <button
            type="button"
            aria-label="Editar nome do cliente"
            title="Editar nome"
            onClick={()=>{setName(conversation.customer_name);setEditingName(value=>!value)}}
          >
            <Pencil size={18}/>
          </button>
        }
        {canMutate&&
          <button
            type="button"
            aria-label={conversation.assistant_enabled?'Pausar Assistente Virtual':'Reativar Assistente Virtual'}
            title={conversation.assistant_enabled?'Pausar Assistente Virtual':'Reativar Assistente Virtual'}
            disabled={assistant.isPending}
            onClick={()=>assistant.mutate({id:conversation.id,enabled:!conversation.assistant_enabled})}
          >
            <Bot size={20}/>
          </button>
        }
      </div>
    </header>

    {editingName&&
      <form className="conversation-messenger__rename" onSubmit={event=>{event.preventDefault();saveName()}}>
        <label>
          <span>Novo nome</span>
          <input maxLength={255} value={name} onChange={event=>setName(event.target.value)} autoFocus/>
        </label>
        <button type="submit" disabled={rename.isPending||!name.trim()}>Salvar</button>
      </form>
    }

    {(rename.isError||assistant.isError)&&
      <p className="conversation-messenger__notice is-error" role="alert">Não foi possível salvar a alteração. Tente novamente.</p>
    }

    <main className="conversation-messenger__thread" role="log" aria-live="polite" aria-relevant="additions text">
      <div className="conversation-messenger__thread-spacer" aria-hidden="true"/>
      {orderedMessages.map(message=>
        <MessageBubble message={message} timezone={timezone} key={message.id}/>
      )}
      <div ref={bottomRef} className="conversation-messenger__anchor" aria-hidden="true"/>
    </main>

    <footer className="conversation-messenger__composer">
      {!conversation.free_form_window_open&&
        <p className="conversation-messenger__notice is-warning" role="status">
          A janela de atendimento está encerrada. Para iniciar novo contato, use uma mensagem template aprovada.
        </p>
      }
      {send.isError&&
        <p className="conversation-messenger__notice is-error" role="alert">
          O envio não foi confirmado. O histórico foi atualizado para mostrar o estado real da mensagem.
        </p>
      }
      <div className="conversation-messenger__composer-row">
        <label>
          <span className="sr-only">Responder conversa</span>
          <textarea
            maxLength={4096}
            rows={1}
            value={text}
            disabled={!canMutate||!conversation.free_form_window_open}
            onChange={event=>setText(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder={canMutate?'Mensagem':'Somente leitura'}
          />
        </label>
        <button
          type="button"
          className="conversation-messenger__send"
          aria-label="Enviar mensagem"
          disabled={!text.trim()||!canMutate||!conversation.free_form_window_open||send.isPending}
          onClick={submitMessage}
        >
          <Send size={20}/>
        </button>
      </div>
    </footer>
  </div>
}

function MessageBubble({message,timezone}:{message:ConversationMessage;timezone?:string}) {
  const outbound=message.direction==='outbound'
  const label=outbound ? (outboundStatusLabels[message.status]??message.status) : null
  return <article className={`conversation-message conversation-message--${message.direction}`}>
    <p>{message.body??`Mensagem ${message.message_type}`}</p>
    <footer>
      <time>{new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:timezone}).format(new Date(message.created_at))}</time>
      {label&&<span className={message.status==='failed'?'is-failed':undefined}>{label}</span>}
    </footer>
  </article>
}
