import { Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ErrorState } from '../../components/ErrorState'
import { InfoHelp } from '../../components/InfoHelp'
import { LoadingState } from '../../components/LoadingState'
import { RequiredLabel } from '../../components/RequiredLabel'
import { canConfigureWhatsApp } from '../auth/types'
import { useAuth } from '../auth/useAuth'
import { useBusiness, useCreateService, useDeleteService, useServices, useUpdateBusiness, useUpdateService } from '../operations/api'

type Draft={name:string;duration:string;price:string}

export function ServiceCatalogPage(){
  const services=useServices()
  const business=useBusiness()
  const create=useCreateService()
  const update=useUpdateService()
  const updateBusiness=useUpdateBusiness()
  const remove=useDeleteService()
  const canEdit=canConfigureWhatsApp(useAuth().membership?.role)
  const [drafts,setDrafts]=useState<Record<string,Draft>>({})
  const [adding,setAdding]=useState(false)
  const [newName,setNewName]=useState('')
  const [newDuration,setNewDuration]=useState('60')
  const [newPrice,setNewPrice]=useState('')
  const [addAttempted,setAddAttempted]=useState(false)
  const [saveAttempted,setSaveAttempted]=useState(false)
  const [deliveryFee,setDeliveryFee]=useState('2,40')
  const [serviceRadius,setServiceRadius]=useState('')
  const [serviceIncludedDistance,setServiceIncludedDistance]=useState('15')
  const [serviceDistanceFee,setServiceDistanceFee]=useState('2,40')
  const [saveState,setSaveState]=useState<'idle'|'saving'|'saved'|'error'>('idle')
  const hydrated=useRef(false)
  const active=useMemo(()=>services.data?.items.filter(item=>item.active)??[],[services.data])

  useEffect(()=>{
    if(!services.data)return
    setDrafts(Object.fromEntries(services.data.items.filter(item=>item.active).map(item=>[item.id,{name:item.name,duration:String(item.duration_minutes),price:item.price==null?'':String(item.price)}])))
    hydrated.current=true
  },[services.data])

  useEffect(()=>{
    if(!business.data)return
    setDeliveryFee(String(business.data.equipment_delivery_fee_per_km??2.4).replace('.',','))
    setServiceRadius(business.data.service_radius_km==null?'':String(business.data.service_radius_km).replace('.',','))
    setServiceIncludedDistance(String(business.data.service_distance_included_km??15).replace('.',','))
    setServiceDistanceFee(String(business.data.service_distance_fee_per_km??2.4).replace('.',','))
  },[business.data])

  const businessDeliveryFee=business.data?.equipment_delivery_fee_per_km??2.4
  const businessServiceRadius=business.data?.service_radius_km??null
  const businessIncludedDistance=business.data?.service_distance_included_km??15
  const businessServiceDistanceFee=business.data?.service_distance_fee_per_km??2.4

  const newDurationNumber=Number(newDuration)
  const newPriceNumber=parseMoney(newPrice)
  const newInvalid={
    name:newName.trim().length<2,
    duration:!Number.isFinite(newDurationNumber)||newDurationNumber<=0,
    price:newPriceNumber===null,
  }
  const draftInvalid=(id:string)=>{
    const draft=drafts[id]
    if(!draft)return true
    const duration=Number(draft.duration)
    return draft.name.trim().length<2||!Number.isFinite(duration)||duration<=0||parseMoney(draft.price)===null
  }
  const catalogInvalid=active.some(item=>draftInvalid(item.id))
  const deliveryFeeNumber=parseMoney(deliveryFee)
  const serviceRadiusNumber=parseOptionalMoney(serviceRadius)
  const serviceIncludedDistanceNumber=parseMoney(serviceIncludedDistance)
  const serviceDistanceFeeNumber=parseMoney(serviceDistanceFee)
  const deliveryFeeInvalid=deliveryFeeNumber===null
  const serviceDistanceInvalid=serviceRadiusNumber===undefined||serviceIncludedDistanceNumber===null||serviceDistanceFeeNumber===null
  const hasChanges=active.some(item=>{
    const draft=drafts[item.id]
    if(!draft)return false
    return draft.name.trim()!==item.name
      || Number(draft.duration)!==item.duration_minutes
      || Number(parseMoney(draft.price))!==Number(item.price)
  }) || Number(deliveryFeeNumber)!==Number(businessDeliveryFee)
    || (serviceRadiusNumber??null)!==(businessServiceRadius==null?null:Number(businessServiceRadius))
    || Number(serviceIncludedDistanceNumber)!==Number(businessIncludedDistance)
    || Number(serviceDistanceFeeNumber)!==Number(businessServiceDistanceFee)

  const add=async()=>{
    setAddAttempted(true)
    if(newInvalid.name||newInvalid.duration||newInvalid.price)return
    await create.mutateAsync({name:newName.trim(),duration_minutes:newDurationNumber,price:newPriceNumber!})
    setNewName('');setNewDuration('60');setNewPrice('');setAdding(false);setAddAttempted(false)
  }
  const save=async()=>{
    setSaveAttempted(true)
    if(catalogInvalid)return
    if(deliveryFeeInvalid||serviceDistanceInvalid)return
    setSaveState('saving')
    try{
      for(const item of active){
        const draft=drafts[item.id]
        const duration=Number(draft.duration),price=parseMoney(draft.price)
        const changed=draft.name.trim()!==item.name
          || duration!==item.duration_minutes
          || Number(price)!==Number(item.price)
        if(changed)await update.mutateAsync({id:item.id,values:{name:draft.name.trim(),duration_minutes:duration,price:price!}})
      }
      const businessUpdates:Record<string,number|null>={}
      if(Number(deliveryFeeNumber)!==Number(businessDeliveryFee))businessUpdates.equipment_delivery_fee_per_km=deliveryFeeNumber!
      if((serviceRadiusNumber??null)!==(businessServiceRadius==null?null:Number(businessServiceRadius)))businessUpdates.service_radius_km=serviceRadiusNumber??null
      if(Number(serviceIncludedDistanceNumber)!==Number(businessIncludedDistance))businessUpdates.service_distance_included_km=serviceIncludedDistanceNumber!
      if(Number(serviceDistanceFeeNumber)!==Number(businessServiceDistanceFee))businessUpdates.service_distance_fee_per_km=serviceDistanceFeeNumber!
      if(Object.keys(businessUpdates).length)await updateBusiness.mutateAsync(businessUpdates)
      setSaveAttempted(false)
      setSaveState('saved')
    }catch{
      setSaveState('error')
    }
  }

  useEffect(()=>{
    if(!hydrated.current||!canEdit||!hasChanges||catalogInvalid||deliveryFeeInvalid||serviceDistanceInvalid)return
    setSaveState('saving')
    const timer=window.setTimeout(()=>{void save()},1200)
    return ()=>window.clearTimeout(timer)
  // Autosave is intentionally driven only by the editable values.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[drafts,deliveryFee,serviceRadius,serviceIncludedDistance,serviceDistanceFee])

  if(services.isPending||business.isPending)return <Shell><LoadingState/></Shell>
  if(services.isError||business.isError||!services.data||!business.data)return <Shell><ErrorState onRetry={()=>{void services.refetch();void business.refetch()}}/></Shell>

  return <Shell>
    <section className="operational-heading"><div><span className="eyebrow">Empresa</span><h1>Catálogo de serviços</h1><p>{saveState==='saving'?'Salvamento automático…':saveState==='saved'?'Alterações salvas automaticamente.':saveState==='error'?'Falha no salvamento automático.':'Alterações válidas são salvas automaticamente.'}</p></div><div className="catalog-heading-actions"><InfoHelp title="Catálogo de serviços">Nome, preço e duração alimentam o Assistente Virtual e o agendamento automático. O raio limita a área atendida; acima da distância incluída, o adicional por KM compõe o valor estimado do serviço.</InfoHelp>{canEdit&&<button className="icon-save-button" type="button" aria-label="Salvar catálogo" title="Salvar agora" disabled={update.isPending||updateBusiness.isPending||catalogInvalid||deliveryFeeInvalid||serviceDistanceInvalid} onClick={()=>void save()}><Save size={19}/></button>}</div></section>
    {canEdit&&<div className="catalog-toolbar"><button className="compact-button" type="button" onClick={()=>{setAdding(value=>!value);setAddAttempted(false)}}><Plus size={16}/>Adicionar serviço</button></div>}
    <section className="settings-form delivery-fee-card">
      <div className="form-grid">
        <label>Raio de atendimento (KM) <span className="optional-label">opcional</span><input className={saveAttempted&&serviceRadiusNumber===undefined?'field-invalid':''} inputMode="decimal" value={serviceRadius} disabled={!canEdit} onChange={event=>setServiceRadius(event.target.value)} placeholder="Sem limite"/><small>Deixe vazio para não limitar a distância máxima de atendimento.</small></label>
        <label>Distância incluída no serviço (KM)<input className={saveAttempted&&serviceIncludedDistanceNumber===null?'field-invalid':''} inputMode="decimal" value={serviceIncludedDistance} disabled={!canEdit} onChange={event=>setServiceIncludedDistance(event.target.value)} placeholder="15"/><small>Até esta distância não há adicional de deslocamento.</small></label>
      </div>
      <div className="form-grid">
        <label>Taxa adicional de distância do serviço (R$/KM)<input className={saveAttempted&&serviceDistanceFeeNumber===null?'field-invalid':''} inputMode="decimal" value={serviceDistanceFee} disabled={!canEdit} onChange={event=>setServiceDistanceFee(event.target.value)} placeholder="2,40"/><small>Padrão: R$ 2,40 por KM excedente acima de 15 KM.</small></label>
        <label>Taxa de entrega de equipamento (R$/KM)<input className={saveAttempted&&deliveryFeeInvalid?'field-invalid':''} inputMode="decimal" value={deliveryFee} disabled={!canEdit} onChange={event=>setDeliveryFee(event.target.value)} placeholder="2,40"/><small>Usada somente na entrega de equipamento sem prestação de serviço.</small></label>
      </div>
      {saveAttempted&&(deliveryFeeInvalid||serviceDistanceInvalid)&&<small className="field-error">Revise os valores de distância e taxa por KM.</small>}
    </section>
    {canEdit&&adding&&<div className="settings-form settings-form--inline">
      <label><RequiredLabel>Serviço</RequiredLabel><input className={addAttempted&&newInvalid.name?'field-invalid':''} value={newName} onChange={event=>setNewName(event.target.value)} placeholder="Ex.: Limpeza de ar-condicionado"/>{addAttempted&&newInvalid.name&&<small className="field-error">Informe o nome do serviço.</small>}</label>
      <div className="form-grid"><label><RequiredLabel>Duração média (minutos)</RequiredLabel><input className={addAttempted&&newInvalid.duration?'field-invalid':''} type="number" min={1} max={1440} value={newDuration} onChange={event=>setNewDuration(event.target.value)}/>{addAttempted&&newInvalid.duration&&<small className="field-error">Informe uma duração válida.</small>}</label><label><RequiredLabel>Preço (R$)</RequiredLabel><input className={addAttempted&&newInvalid.price?'field-invalid':''} inputMode="decimal" value={newPrice} onChange={event=>setNewPrice(event.target.value)} placeholder="0,00"/>{addAttempted&&newInvalid.price&&<small className="field-error">Informe o preço.</small>}</label></div>
      <button className="primary-button" type="button" disabled={create.isPending} onClick={()=>void add()}>{create.isPending?'Adicionando…':'Adicionar à lista'}</button>
    </div>}
    <div className="catalog-table-list">
      {active.map(item=>{
        const draft=drafts[item.id]??{name:item.name,duration:String(item.duration_minutes),price:item.price==null?'':String(item.price)}
        const invalidName=draft.name.trim().length<2
        const duration=Number(draft.duration),invalidDuration=!Number.isFinite(duration)||duration<=0
        const invalidPrice=parseMoney(draft.price)===null
        return <article className="catalog-table-row catalog-table-row--service" key={item.id}>
          <div><RequiredLabel>Serviço</RequiredLabel><input aria-label="Nome do serviço" className={saveAttempted&&invalidName?'field-invalid':''} value={draft.name} disabled={!canEdit} onChange={event=>setDrafts(current=>({...current,[item.id]:{...draft,name:event.target.value}}))}/>{saveAttempted&&invalidName&&<small className="field-error">Informe o nome do serviço.</small>}</div>
          <div><label><RequiredLabel>Duração média (minutos)</RequiredLabel><input className={saveAttempted&&invalidDuration?'field-invalid':''} type="number" min={1} max={1440} value={draft.duration} disabled={!canEdit} onChange={event=>setDrafts(current=>({...current,[item.id]:{...draft,duration:event.target.value}}))}/>{saveAttempted&&invalidDuration&&<small className="field-error">Informe a duração.</small>}</label></div>
          <div><label><RequiredLabel>Preço (R$)</RequiredLabel><input className={saveAttempted&&invalidPrice?'field-invalid':''} inputMode="decimal" value={draft.price} disabled={!canEdit} onChange={event=>setDrafts(current=>({...current,[item.id]:{...draft,price:event.target.value}}))}/>{saveAttempted&&invalidPrice&&<small className="field-error">Informe o preço.</small>}</label></div>
          {canEdit&&<button className="catalog-icon-danger" type="button" aria-label={`Excluir ${item.name}`} disabled={remove.isPending} onClick={()=>remove.mutate(item.id)}><Trash2 size={17}/></button>}
        </article>
      })}
      {!active.length&&<p className="settings-empty">Nenhum serviço cadastrado. Adicione o primeiro serviço acima.</p>}
    </div>
    {saveAttempted&&catalogInvalid&&<p className="form-error" role="alert">Preencha todos os campos obrigatórios de todos os serviços antes de salvar.</p>}
    {(create.isError||update.isError||updateBusiness.isError||remove.isError||saveState==='error')&&<MutationError/>}
  </Shell>
}

function parseMoney(value:string){if(!value.trim())return null;const parsed=Number(value.replace(',','.'));return Number.isFinite(parsed)&&parsed>=0?parsed:null}
function parseOptionalMoney(value:string){if(!value.trim())return null;const parsed=Number(value.replace(',','.'));return Number.isFinite(parsed)&&parsed>=0?parsed:undefined}
function MutationError(){return <p className="form-error" role="alert">Não foi possível salvar. Revise os dados e tente novamente.</p>}
function Shell({children}:{children:React.ReactNode}){return <div className="page-stack operational-page compact-page settings-page">{children}</div>}
