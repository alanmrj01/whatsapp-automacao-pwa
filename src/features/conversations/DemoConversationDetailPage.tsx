import { ArrowLeft, Bot, CalendarPlus2, CheckCheck, Info, Pencil, Pin, Send, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BottomSheet } from '../../components/BottomSheet'
import { demoConversations } from '../../demo/operationalDemo'
import { DemoInsight } from '../access/DemoInsight'
import { useUpgradePrompt } from '../access/upgradePromptContext'
import './conversation-detail.css'

const statusLabels = {
  waiting:'Aguardando atendimento',
  in_progress:'Em atendimento',
  answered:'Respondida',
} as const

export function DemoConversationDetailPage() {
  const {conversationId=''}=useParams()
  const {openUpgrade}=useUpgradePrompt()
  const [contactOpen,setContactOpen]=useState(false)
  const [text,setText]=useState('')
  const conversation=demoConversations.find(item=>item.id===conversationId)

  if(!conversation)return <div className="conversation-detail-page conversation-detail-page--state"><div className="inline-empty"><span>Conversa demonstrativa não encontrada.</span><Link className="compact-button" to="/app/conversas">Voltar</Link></div></div>

  const blocked=(feature:string)=>()=>openUpgrade(feature)
  const openContact=()=>setContactOpen(true)
  const submit=()=>{
    if(!text.trim())return
    openUpgrade('Responder uma conversa')
  }

  return <div className="conversation-detail-page demo-conversation-detail" data-demo-conversation={conversation.id}>
    <header className="conversation-detail-header">
      <Link className="conversation-header-action" to="/app/conversas" aria-label="Voltar para conversas" title="Voltar"><ArrowLeft size={22}/></Link>
      <button type="button" className={`conversation-assistant-toggle ${conversation.assistantEnabled?'is-active':'is-paused'}`} onClick={blocked('Pausar ou ativar o Assistente Virtual')} aria-label="Configurar Assistente Virtual"><Bot size={18}/><span>{conversation.assistantEnabled?'Auto':'Pausado'}</span></button>
      <button className="conversation-contact-avatar-button" type="button" onClick={openContact} aria-label="Abrir dados do contato"><span className="conversation-avatar conversation-detail-avatar" aria-hidden="true">{initials(conversation.customer)}</span></button>
      <button className="conversation-detail-header__identity" type="button" onClick={openContact} aria-label="Abrir dados do contato"><strong>{conversation.customer}</strong><span>{conversation.phone}</span><small>{statusLabels[conversation.status]}</small></button>
      <div className="conversation-detail-header__actions"><button type="button" className="conversation-header-action" aria-label="Dados do contato" title="Dados do contato" onClick={openContact}><Info size={20}/></button></div>
    </header>

    <main className="conversation-thread" aria-live="polite" aria-label="Histórico demonstrativo da conversa">
      <DemoInsight>Enquanto você está no serviço, as mensagens continuam chegando.</DemoInsight>
      {conversation.messages.map(message=>message.direction==='system'
        ? <article className="conversation-demo-event" key={message.id}><span>{message.body}</span><time>{message.time}</time></article>
        : <article className={`conversation-bubble conversation-bubble--${message.direction==='customer'?'inbound':'outbound'}`} key={message.id}><p>{message.body}</p><footer><time>{message.time}</time>{message.direction==='assistant'&&<span className="conversation-delivery-status conversation-delivery-status--read">Lida</span>}</footer></article>)}
    </main>

    <footer className="conversation-composer">
      <div className="conversation-composer__row">
        <label><span className="sr-only">Responder conversa demonstrativa</span><textarea maxLength={4096} rows={1} value={text} onChange={event=>setText(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();submit()}}} placeholder="Escreva uma mensagem"/></label>
        <button type="button" className="composer-send" aria-label="Enviar mensagem" onClick={submit}><Send size={20}/></button>
      </div>
    </footer>

    <BottomSheet open={contactOpen} title="Dados do contato" description="Exemplo fictício em modo somente leitura." onClose={()=>setContactOpen(false)}>
      <div className="conversation-contact-sheet">
        <section className="conversation-contact-profile"><div className="conversation-avatar conversation-contact-profile__avatar" aria-hidden="true">{initials(conversation.customer)}</div><strong>{conversation.customer}</strong><span>{conversation.phone}</span><small>{statusLabels[conversation.status]}</small></section>
        <div className="conversation-contact-quick-actions" aria-label="Ações rápidas demonstrativas">
          <button type="button" onClick={blocked('Criar um agendamento')}><CalendarPlus2/><span>Agendar</span></button>
          <button type="button" onClick={blocked('Fixar uma conversa')}><Pin/><span>Fixar</span></button>
          <button type="button" onClick={blocked('Alterar o status de leitura')}><CheckCheck/><span>Marcar lida</span></button>
        </div>
        <section className="conversation-contact-section"><h3>Contato</h3><button className="conversation-contact-row" type="button" onClick={blocked('Alterar o nome do contato')}><div><span>Nome</span><strong>{conversation.customer}</strong></div><Pencil size={18}/></button><div className="conversation-contact-row is-static"><div><span>WhatsApp</span><strong>{conversation.phone}</strong></div></div></section>
        <section className="conversation-contact-section"><h3>Atendimento</h3><div className={`conversation-assistant-card ${conversation.assistantEnabled?'is-active':'is-paused'}`}><div><Bot size={20}/><div><span>Assistente nesta conversa</span><strong>{conversation.assistantEnabled?'Assistente ativo':'Assistente pausado'}</strong></div></div><button className="primary-button" type="button" onClick={blocked('Pausar ou ativar o Assistente Virtual')}>{conversation.assistantEnabled?'Desativar':'Reativar assistente'}</button></div></section>
        <button className="conversation-contact-danger" type="button" onClick={blocked('Excluir uma conversa')}><Trash2 size={18}/>Excluir conversa</button>
      </div>
    </BottomSheet>
  </div>
}

function initials(name:string) {
  return name.trim().split(/\s+/).slice(0,2).map(part=>part[0]??'').join('').toUpperCase()||'?'
}
