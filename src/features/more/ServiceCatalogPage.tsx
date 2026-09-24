import { Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ErrorState } from '../../components/ErrorState'
import { InfoHelp } from '../../components/InfoHelp'
import { LoadingState } from '../../components/LoadingState'
import { RequiredLabel } from '../../components/RequiredLabel'
import { canConfigureWhatsApp } from '../auth/types'
import { useAuth } from '../auth/useAuth'
import { useCreateService, useDeleteService, useServices, useUpdateService } from '../operations/api'

type Draft={name:string;duration:string;price:string}

export function ServiceCatalogPage(){
  const services=useServices()
  const create=useCreateService()
  const update=useUpdateService()
  const remove=useDeleteService()
  const canEdit=canConfigureWhatsApp(useAuth().membership?.role)
  const [drafts,setDrafts]=useState<Record<string,Draft>>({})
  const [adding,setAdding]=useState(false)
  const [newName,setNewName]=useState('')
  const [newDuration,setNewDuration]=useState('60')
  const [newPrice,setNewPrice]=useState('')
  const [addAttempted,setAddAttempted]=useState(false)
  const [saveAttempted,setSaveAttempted]=useState(false)
  const active=useMemo(()=>services.data?.items.filter(item=>item.active)??[],[services.data])

  useEffect(()=>{
    if(!services.data)return
    setDrafts(Object.fromEntries(services.data.items.filter(item=>item.active).map(item=>[item.id,{name:item.name,duration:String(item.duration_minutes),price:item.price==null?'':String(item.price)}])))
  },[services.data])

  if(services.isPending)return <Shell><LoadingState/></Shell>
  if(services.isError||!services.data)return <Shell><ErrorState onRetry={()=>void services.refetch()}/></Shell>

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

  const add=async()=>{
    setAddAttempted(true)
    if(newInvalid.name||newInvalid.duration||newInvalid.price)return
    await create.mutateAsync({name:newName.trim(),duration_minutes:newDurationNumber,price:newPriceNumber!})
    setNewName('');setNewDuration('60');setNewPrice('');setAdding(false);setAddAttempted(false)
  }
  const save=async()=>{
    setSaveAttempted(true)
    if(catalogInvalid)return
    for(const item of active){
      const draft=drafts[item.id]
      const duration=Number(draft.duration),price=parseMoney(draft.price)
      await update.mutateAsync({id:item.id,values:{name:draft.name.trim(),duration_minutes:duration,price:price!}})
    }
    setSaveAttempted(false)
  }

  return <Shell>
    <section className="operational-heading"><div><span className="eyebrow">Empresa</span><h1>Catálogo de serviços</h1></div><InfoHelp title="Catálogo de serviços">Nome, preço e duração alimentam o Assistente Virtual e o agendamento automático. Itens excluídos deixam de ser oferecidos sem apagar o histórico de atendimentos.</InfoHelp></section>
    {canEdit&&<div className="catalog-toolbar"><button className="compact-button" type="button" onClick={()=>{setAdding(value=>!value);setAddAttempted(false)}}><Plus size={16}/>Adicionar serviço</button></div>}
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
    {(create.isError||update.isError||remove.isError)&&<MutationError/>}
    {update.isSuccess&&!catalogInvalid&&<p className="form-success">Serviços salvos.</p>}
    {canEdit&&!!active.length&&<button className="primary-button" type="button" disabled={update.isPending} onClick={()=>void save()}><Save size={17}/>{update.isPending?'Salvando…':'Salvar serviços'}</button>}
  </Shell>
}

function parseMoney(value:string){if(!value.trim())return null;const parsed=Number(value.replace(',','.'));return Number.isFinite(parsed)&&parsed>=0?parsed:null}
function MutationError(){return <p className="form-error" role="alert">Não foi possível salvar. Revise os dados e tente novamente.</p>}
function Shell({children}:{children:React.ReactNode}){return <div className="page-stack operational-page compact-page settings-page">{children}</div>}
