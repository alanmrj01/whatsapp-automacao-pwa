import { BotOff, ContactRound, Save, Smartphone, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ErrorState } from '../../components/ErrorState'
import { InfoHelp } from '../../components/InfoHelp'
import { LoadingState } from '../../components/LoadingState'
import { canConfigureWhatsApp } from '../auth/types'
import { useAuth } from '../auth/useAuth'
import {
  useAddAssistantExclusion,
  useAssistantExclusions,
  useAutomationSettings,
  useConversationContacts,
  useRemoveAssistantExclusion,
  useUpdateAutomation,
} from '../operations/api'
import type { AssistantExclusion, AutomationSettings, Conversation } from '../operations/types'

const windowOptions=[5,10,20,30,60,120,240,360,720,1440,2160]

export function AutomationSettingsPage(){
  const settings=useAutomationSettings(),conversationContacts=useConversationContacts(),exclusions=useAssistantExclusions()
  const canEdit=canConfigureWhatsApp(useAuth().membership?.role)
  const pending=settings.isPending||conversationContacts.isPending||exclusions.isPending
  const error=settings.isError||conversationContacts.isError||exclusions.isError
  return <Shell>
    <section className="operational-heading"><div><span className="eyebrow">Atendimento</span><h1>Assistente Virtual</h1></div><InfoHelp title="Assistente Virtual">Ajuste apenas o comportamento visível do Assistente e os contatos que não devem receber respostas automáticas. O reconhecimento técnico dos serviços é gerenciado automaticamente pelo ALOVIA.</InfoHelp></section>
    {pending&&<LoadingState/>}
    {error&&<ErrorState onRetry={()=>{void settings.refetch();void conversationContacts.refetch();void exclusions.refetch()}}/>}
    {settings.data&&conversationContacts.data&&exclusions.data&&<>
      <AutomationForm settings={settings.data} canEdit={canEdit}/>
      <Exclusions conversations={conversationContacts.data.items} exclusions={exclusions.data.items} canEdit={canEdit}/>
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

type DeviceContact = {name?:string[];tel?:string[]}
type ContactProperty = 'name'|'tel'
type ContactNavigator = Navigator & {
  contacts?: {
    getProperties?:()=>Promise<string[]>
    select:(properties:ContactProperty[],options:{multiple:boolean})=>Promise<DeviceContact[]>
  }
}

function Exclusions({conversations,exclusions,canEdit}:{conversations:Conversation[];exclusions:AssistantExclusion[];canEdit:boolean}){
  const add=useAddAssistantExclusion(),remove=useRemoveAssistantExclusion()
  const [source,setSource]=useState<'device'|'customer'|'manual'>('device')
  const [customerId,setCustomerId]=useState('')
  const [manualPhone,setManualPhone]=useState('')
  const [manualLabel,setManualLabel]=useState('')
  const [devicePhones,setDevicePhones]=useState<string[]>([])
  const [reason,setReason]=useState('')
  const [contactError,setContactError]=useState(false)
  const excluded=new Set(exclusions.map(item=>item.whatsapp_id))
  const conversationContacts=[...new Map(
    conversations
      .map(item=>{
        const whatsappId=(item.customer_whatsapp_id??item.customer_phone??'').replace(/\D/g,'')
        const displayPhone=(item.customer_phone??item.customer_whatsapp_id??'').replace(/\D/g,'')
        return [whatsappId,{id:item.customer_id,name:item.customer_name,whatsappId,displayPhone}] as const
      })
      .filter(([whatsappId])=>whatsappId&&!excluded.has(whatsappId)),
  ).values()].sort((left,right)=>left.name.localeCompare(right.name,'pt-BR'))
  const selected=conversationContacts.find(item=>item.whatsappId===customerId)
  const normalizedManualPhone=manualPhone.replace(/\D/g,'')
  const manualValid=/^[1-9]\d{6,14}$/.test(normalizedManualPhone)&&!excluded.has(normalizedManualPhone)
  const contactNavigator=navigator as ContactNavigator
  const canPickDeviceContact=typeof contactNavigator.contacts?.select==='function'

  const pickDeviceContact=async()=>{
    if(!canPickDeviceContact)return
    setContactError(false)
    try{
      const supported=await contactNavigator.contacts!.getProperties?.()
      const properties:ContactProperty[]=['name','tel'].filter(
        property=>!supported||supported.includes(property),
      ) as ContactProperty[]
      if(!properties.includes('tel')){
        setContactError(true)
        return
      }
      const [contact]=await contactNavigator.contacts!.select(properties,{multiple:false})
      const phones=(contact?.tel??[]).filter(Boolean)
      const label=contact?.name?.[0]??''
      if(!phones.length)return
      setDevicePhones(phones)
      setManualPhone(phones[0])
      setManualLabel(label)
      setSource('device')
    }catch{
      setContactError(true)
    }
  }

  const submit=()=>{
    const whatsappId=source==='customer'?selected?.whatsappId:normalizedManualPhone
    if(!whatsappId)return
    const label=source==='customer'?selected?.name:manualLabel.trim()||null
    add.mutate({whatsapp_id:whatsappId,label,reason:reason.trim()||null,mode:'human_only'},{onSuccess:()=>{setCustomerId('');setManualPhone('');setManualLabel('');setDevicePhones([]);setReason('')}})
  }
  return <section aria-labelledby="exclusions-title">
    <div className="section-title-row"><div><span className="eyebrow">Exceções permanentes</span><h2 id="exclusions-title">Contatos sem resposta automática</h2></div><InfoHelp title="Contatos sem resposta automática">As mensagens continuam aparecendo normalmente, mas o Assistente Virtual não responde sozinho.</InfoHelp></div>
    {canEdit&&<form className="settings-form settings-form--inline" onSubmit={event=>{event.preventDefault();submit()}}>
      <label>Como adicionar<select value={source} onChange={event=>setSource(event.target.value as 'device'|'customer'|'manual')}><option value="customer">Buscar nos contatos do ALOVIA</option><option value="manual">Adicionar por número</option><option value="device">Selecionar da agenda do celular</option></select></label>
      {source==='device'&&<>
        {canPickDeviceContact?<><button className="secondary-button contact-picker-button" type="button" onClick={()=>void pickDeviceContact()}><Smartphone size={18}/>Abrir contatos do aparelho</button><p className="settings-note">Escolha um contato disponível na agenda do aparelho.</p></>:<p className="settings-note">Este navegador não permite abrir os contatos do aparelho. Use “Buscar nos contatos do ALOVIA” ou “Adicionar por número”.</p>}
        {!!manualPhone&&<div className="settings-contact-preview"><ContactRound size={18}/><div><strong>{manualLabel||'Contato selecionado'}</strong><span>{manualPhone}</span></div></div>}
        {devicePhones.length>1&&<label>Número do contato<select value={manualPhone} onChange={event=>setManualPhone(event.target.value)}>{devicePhones.map(phone=><option value={phone} key={phone}>{phone}</option>)}</select><small>Este contato possui mais de um número. Escolha qual deve ficar sem resposta automática.</small></label>}
        <div className="contact-picker-fallbacks">
          <button type="button" className="secondary-button" onClick={()=>setSource('customer')}>Buscar no ALOVIA</button>
          <button type="button" className="secondary-button" onClick={()=>setSource('manual')}>Adicionar pelo número</button>
        </div>
        {contactError&&<p className="form-error" role="alert">Não foi possível abrir ou ler o contato selecionado. Tente a busca do ALOVIA ou adicione o número manualmente.</p>}
      </>}
      {source==='customer'&&<>
        <label>Contato do ALOVIA<select required value={customerId} onChange={event=>setCustomerId(event.target.value)}><option value="">Selecione um contato</option>{conversationContacts.map(item=><option value={item.whatsappId} key={item.whatsappId}>{item.name}{item.displayPhone?' · +'+item.displayPhone:''}</option>)}</select><small>Esta lista mostra os contatos das conversas existentes no ALOVIA.</small></label>
        {!conversationContacts.length&&<p className="settings-note">Nenhum contato de conversa disponível. Você pode selecionar da agenda do aparelho ou adicionar pelo número.</p>}
      </>}
      {source==='manual'&&<>
        <label>Telefone<input required inputMode="tel" autoComplete="tel" value={manualPhone} onChange={event=>setManualPhone(event.target.value)} placeholder="Ex.: 5511999999999"/><small>Informe país e DDD. O número é normalizado antes de salvar.</small></label>
        <label>Nome ou rótulo <span className="optional-label">opcional</span><input maxLength={255} value={manualLabel} onChange={event=>setManualLabel(event.target.value)} placeholder="Ex.: Fornecedor"/></label>
      </>}
      {source==='device'&&manualPhone&&<label>Nome do contato <span className="optional-label">opcional</span><input maxLength={255} value={manualLabel} onChange={event=>setManualLabel(event.target.value)}/></label>}
      <label>Motivo <span className="optional-label">opcional</span><input maxLength={2000} value={reason} onChange={event=>setReason(event.target.value)} placeholder="Ex.: fornecedor, cliente que prefere atendimento humano"/></label>
      {add.isError&&<MutationError/>}
      {source!=='customer'&&normalizedManualPhone&&excluded.has(normalizedManualPhone)&&<p className="settings-warning">Este número já está na lista.</p>}
      <button className="primary-button" disabled={add.isPending||(source==='customer'?!selected?.whatsappId:!manualValid)}><BotOff size={18}/>{add.isPending?'Salvando…':'Nunca responder automaticamente'}</button>
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