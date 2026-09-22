import { BotOff, Boxes, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ErrorState } from '../../components/ErrorState'
import { InfoHelp } from '../../components/InfoHelp'
import { LoadingState } from '../../components/LoadingState'
import { StatusBadge } from '../../components/StatusBadge'
import { canConfigureWhatsApp } from '../auth/types'
import { useAuth } from '../auth/useAuth'
import {
  useAddAssistantExclusion,
  useAssistantExclusions,
  useAutomationSettings,
  useCustomers,
  useRemoveAssistantExclusion,
  useServices,
  useUpdateAutomation,
  useUpdateService,
} from '../operations/api'
import type { AssistantExclusion, AutomationSettings, Customer, Service } from '../operations/types'

const windowOptions=[5,10,20,30,60,120,240,360,720,1440,2160]

export function AutomationSettingsPage(){
  const settings=useAutomationSettings(),customers=useCustomers(),exclusions=useAssistantExclusions(),services=useServices()
  const canEdit=canConfigureWhatsApp(useAuth().membership?.role)
  const pending=settings.isPending||customers.isPending||exclusions.isPending||services.isPending
  const error=settings.isError||customers.isError||exclusions.isError||services.isError
  return <Shell>
    <section className="operational-heading"><div><span className="eyebrow">Atendimento</span><h1>Assistente Virtual</h1></div><InfoHelp title="Assistente Virtual">O ALOVIA usa contexto, exemplos e similaridade semântica para reconhecer pedidos. Você pode ajustar exemplos e contatos que nunca devem receber resposta automática.</InfoHelp></section>
    {pending&&<LoadingState/>}
    {error&&<ErrorState onRetry={()=>{void settings.refetch();void customers.refetch();void exclusions.refetch();void services.refetch()}}/>}
    {settings.data&&customers.data&&exclusions.data&&services.data&&<>
      <AutomationForm settings={settings.data} canEdit={canEdit}/>
      <Recognition services={services.data.items} canEdit={canEdit}/>
      <Exclusions customers={customers.data.items} exclusions={exclusions.data.items} canEdit={canEdit}/>
    </>}
  </Shell>
}

function AutomationForm({settings,canEdit}:{settings:AutomationSettings;canEdit:boolean}){
  const update=useUpdateAutomation()
  const [enabled,setEnabled]=useState(settings.assistant_enabled)
  const [minutes,setMinutes]=useState(settings.human_control_window_minutes)
  const [greeting,setGreeting]=useState(settings.greeting_message)
  const [fallback,setFallback]=useState(settings.fallback_message)
  const [handoff,setHandoff]=useState(settings.handoff_message)
  const [saved,setSaved]=useState(false)
  return <form className="settings-form" onSubmit={event=>{event.preventDefault();setSaved(false);update.mutate({assistant_enabled:enabled,human_control_window_minutes:minutes,greeting_message:greeting,fallback_message:fallback,handoff_message:handoff},{onSuccess:()=>setSaved(true)})}}>
    <label className="check-row"><input type="checkbox" checked={enabled} disabled={!canEdit} onChange={event=>setEnabled(event.target.checked)}/>Assistente Virtual ativo</label>
    <label>Tempo antes do Assistente retomar após atendimento humano<select value={minutes} disabled={!canEdit} onChange={event=>setMinutes(Number(event.target.value))}>{windowOptions.map(value=><option value={value} key={value}>{formatWindow(value)}</option>)}</select></label>
    <label>Mensagem inicial<textarea required maxLength={1000} rows={3} value={greeting} disabled={!canEdit} onChange={event=>setGreeting(event.target.value)}/></label>
    <label>Mensagem quando não entende o pedido<textarea required maxLength={1000} rows={3} value={fallback} disabled={!canEdit} onChange={event=>setFallback(event.target.value)}/></label>
    <label>Mensagem ao encaminhar para atendimento humano<textarea required maxLength={1000} rows={3} value={handoff} disabled={!canEdit} onChange={event=>setHandoff(event.target.value)}/></label>
    {update.isError&&<MutationError/>}{saved&&<p className="form-success">Configuração salva.</p>}
    {canEdit&&<button className="primary-button" disabled={update.isPending}><Save size={18}/>{update.isPending?'Salvando…':'Salvar configurações'}</button>}
  </form>
}

function Recognition({services,canEdit}:{services:Service[];canEdit:boolean}){
  return <section aria-labelledby="recognition-title">
    <div className="section-title-row"><div><span className="eyebrow">Entendimento do cliente</span><h2 id="recognition-title">Como o ALOVIA reconhece seus serviços</h2></div><InfoHelp title="Reconhecimento de serviços">Essas frases são geradas automaticamente. O Assistente também considera palavras equivalentes e o contexto da pergunta anterior.</InfoHelp></div>
    <div className="settings-list">{services.filter(item=>item.active).map(item=><RecognitionEditor service={item} canEdit={canEdit} key={item.id}/>)}</div>
  </section>
}

function RecognitionEditor({service,canEdit}:{service:Service;canEdit:boolean}){
  const update=useUpdateService()
  const [text,setText]=useState(service.intent_examples.join('\n'))
  const [saved,setSaved]=useState(false)
  const examples=text.split('\n').map(item=>item.trim()).filter(Boolean)
  return <article className="settings-editor">
    <div className="settings-editor__heading"><Boxes/><strong>{service.name}</strong><StatusBadge tone="info">{service.intent_examples.length} exemplos</StatusBadge></div>
    <label>Frases de referência<textarea rows={7} value={text} disabled={!canEdit} onChange={event=>setText(event.target.value)} placeholder="Uma frase por linha"/></label>
    <p className="settings-note">Você não precisa listar todas as formas possíveis. Essas frases ajudam o ALOVIA a reconhecer intenções parecidas.</p>
    {update.isError&&<MutationError/>}{saved&&<p className="form-success">Exemplos salvos.</p>}
    {canEdit&&<button className="compact-button" type="button" disabled={update.isPending||!examples.length} onClick={()=>{setSaved(false);update.mutate({id:service.id,values:{intent_examples:examples}},{onSuccess:()=>setSaved(true)})}}><Save size={16}/>{update.isPending?'Salvando…':'Salvar exemplos'}</button>}
  </article>
}

function Exclusions({customers,exclusions,canEdit}:{customers:Customer[];exclusions:AssistantExclusion[];canEdit:boolean}){
  const add=useAddAssistantExclusion(),remove=useRemoveAssistantExclusion()
  const [customerId,setCustomerId]=useState('')
  const [reason,setReason]=useState('')
  const selected=customers.find(item=>item.id===customerId)
  const excluded=new Set(exclusions.map(item=>item.whatsapp_id))
  const available=customers.filter(item=>item.phone&&!excluded.has(item.phone.replace(/\D/g,'')))
  const submit=()=>{
    if(!selected?.phone)return
    add.mutate({whatsapp_id:selected.phone.replace(/\D/g,''),label:selected.name,reason:reason.trim()||null,mode:'human_only'},{onSuccess:()=>{setCustomerId('');setReason('')}})
  }
  return <section aria-labelledby="exclusions-title">
    <div className="section-title-row"><div><span className="eyebrow">Exceções permanentes</span><h2 id="exclusions-title">Contatos sem resposta automática</h2></div><InfoHelp title="Contatos sem resposta automática">As mensagens continuam aparecendo normalmente, mas o Assistente Virtual não responde sozinho.</InfoHelp></div>
    {canEdit&&<form className="settings-form settings-form--inline" onSubmit={event=>{event.preventDefault();submit()}}>
      <label>Contato<select required value={customerId} onChange={event=>setCustomerId(event.target.value)}><option value="">Selecione</option>{available.map(item=><option value={item.id} key={item.id}>{item.name}{item.phone?' · '+item.phone:''}</option>)}</select></label>
      <label>Motivo <span className="optional-label">opcional</span><input maxLength={2000} value={reason} onChange={event=>setReason(event.target.value)} placeholder="Ex.: fornecedor, cliente que prefere atendimento humano"/></label>
      {add.isError&&<MutationError/>}
      <button className="primary-button" disabled={add.isPending||!selected?.phone}><BotOff size={18}/>{add.isPending?'Salvando…':'Nunca responder automaticamente'}</button>
    </form>}
    <div className="settings-list">{exclusions.map(item=><article className="settings-row" key={item.id}><BotOff/><div><strong>{item.label??item.whatsapp_id}</strong><span>+{item.whatsapp_id}{item.reason?' · '+item.reason:''}</span></div>{canEdit&&<button className="danger-button" type="button" disabled={remove.isPending} onClick={()=>remove.mutate(item.id)}><Trash2 size={16}/>Remover</button>}</article>)}{!exclusions.length&&<p className="settings-empty">Nenhum contato nesta lista.</p>}</div>
  </section>
}

function formatWindow(value:number){
  if(value<60)return String(value)+' minutos'
  if(value%1440===0)return String(value/1440)+' dia(s)'
  return String(value/60)+' hora(s)'
}
function MutationError(){return <p className="form-error" role="alert">Não foi possível salvar. Tente novamente.</p>}
function Shell({children}:{children:React.ReactNode}){return <div className="page-stack operational-page compact-page settings-page">{children}</div>}
