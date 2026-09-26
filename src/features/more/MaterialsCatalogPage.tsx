import { ExternalLink, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ErrorState } from '../../components/ErrorState'
import { InfoHelp } from '../../components/InfoHelp'
import { LoadingState } from '../../components/LoadingState'
import { RequiredLabel } from '../../components/RequiredLabel'
import { canConfigureWhatsApp } from '../auth/types'
import { useAuth } from '../auth/useAuth'
import { useBusiness, useCatalogItems, useCreateCatalogItem, useDeleteCatalogItem, useUpdateBusiness, useUpdateCatalogItem } from '../operations/api'
import type { CatalogItem } from '../operations/types'

const unitOptions=[
  {value:'metro',label:'Por metro'},
  {value:'unidade',label:'Por unidade'},
  {value:'kit',label:'Por kit'},
  {value:'valor fixo',label:'Valor fixo'},
] as const

type Draft={kind:'material'|'equipment';name:string;description:string;price:string;unit:string;active:boolean}

export function MaterialsCatalogPage(){
  const items=useCatalogItems()
  const business=useBusiness()
  const create=useCreateCatalogItem()
  const update=useUpdateCatalogItem()
  const remove=useDeleteCatalogItem()
  const updateBusiness=useUpdateBusiness()
  const canEdit=canConfigureWhatsApp(useAuth().membership?.role)
  const [drafts,setDrafts]=useState<Record<string,Draft>>({})
  const [adding,setAdding]=useState(false)
  const [newKind,setNewKind]=useState<'material'|'equipment'>('material')
  const [newName,setNewName]=useState('')
  const [newDescription,setNewDescription]=useState('')
  const [newPrice,setNewPrice]=useState('')
  const [newUnit,setNewUnit]=useState('unidade')
  const [addAttempted,setAddAttempted]=useState(false)
  const [saveAttempted,setSaveAttempted]=useState(false)
  const activeMaterials=useMemo(()=>items.data?.items.filter(item=>item.kind==='material'&&item.active)??[],[items.data])
  const equipmentReferences=useMemo(()=>items.data?.items.filter(item=>item.equipment_details!==null)??[],[items.data])

  useEffect(()=>{
    if(!items.data)return
    setDrafts(Object.fromEntries(items.data.items.map(item=>[item.id,toDraft(item)])))
  },[items.data])

  if(items.isPending||business.isPending)return <Shell><LoadingState/></Shell>
  if(items.isError||business.isError||!items.data||!business.data)return <Shell><ErrorState onRetry={()=>{void items.refetch();void business.refetch()}}/></Shell>
  const optedOut=business.data.materials_catalog_reviewed&&!activeMaterials.length
  const materialDraftInvalid=(id:string)=>{
    const draft=drafts[id]
    return !draft||draft.name.trim().length<2||parseMoney(draft.price)===null||!draft.unit
  }
  const equipmentDraftInvalid=(id:string)=>{
    const draft=drafts[id]
    return !draft||draft.name.trim().length<2||!draft.unit||(!!draft.price.trim()&&parseMoney(draft.price)===null)
  }
  const catalogInvalid=activeMaterials.some(item=>materialDraftInvalid(item.id))||equipmentReferences.some(item=>equipmentDraftInvalid(item.id))

  const toggleOptOut=async(checked:boolean)=>{
    if(checked){
      for(const item of activeMaterials)await remove.mutateAsync(item.id)
      await updateBusiness.mutateAsync({materials_catalog_reviewed:true})
    }else{
      await updateBusiness.mutateAsync({materials_catalog_reviewed:false})
    }
    setSaveAttempted(false)
    await items.refetch()
  }
  const add=async()=>{
    setAddAttempted(true)
    const price=parseMoney(newPrice)
    if(!newKind||newName.trim().length<2||price===null||!newUnit)return
    await create.mutateAsync({kind:newKind,name:newName.trim(),description:newDescription.trim()||null,price,unit_label:newUnit})
    setNewKind('material');setNewName('');setNewDescription('');setNewPrice('');setNewUnit('unidade');setAdding(false);setAddAttempted(false)
  }
  const save=async()=>{
    setSaveAttempted(true)
    if(catalogInvalid)return
    for(const item of activeMaterials){
      const draft=drafts[item.id]
      await update.mutateAsync({id:item.id,values:{kind:'material',name:draft.name.trim(),description:draft.description.trim()||null,price:parseMoney(draft.price)!,unit_label:draft.unit,active:true}})
    }
    for(const item of equipmentReferences){
      const draft=drafts[item.id]
      await update.mutateAsync({id:item.id,values:{price:draft.price.trim()?parseMoney(draft.price):null,unit_label:draft.unit,active:draft.active}})
    }
    await updateBusiness.mutateAsync({materials_catalog_reviewed:true})
    setSaveAttempted(false)
  }

  return <Shell>
    <section className="operational-heading"><div><span className="eyebrow">Empresa</span><h1>Catálogo de equipamentos e materiais</h1></div><InfoHelp title="Catálogo da empresa">Materiais cobrados e equipamentos de referência têm regras separadas. A recomendação usa somente equipamentos ativos da sua empresa.</InfoHelp></section>
    {canEdit&&<label className="settings-editor materials-opt-out">
      <span>Política de cobrança de materiais</span>
      <span className="settings-checkbox"><input type="checkbox" checked={optedOut} disabled={updateBusiness.isPending||remove.isPending} onChange={event=>void toggleOptOut(event.target.checked)}/><strong>Minha empresa não cobra materiais adicionais separadamente</strong></span>
      <small>Esta opção afeta somente materiais. Os equipamentos de referência permanecem no catálogo.</small>
    </label>}
    {canEdit&&<div className="catalog-toolbar"><button className="compact-button" type="button" onClick={()=>{setAdding(value=>!value);setAddAttempted(false)}}><Plus size={16}/>Adicionar material ou equipamento</button></div>}
    {canEdit&&adding&&<div className="settings-form settings-form--inline">
      <label><RequiredLabel>Tipo</RequiredLabel><select value={newKind} onChange={event=>setNewKind(event.target.value as 'material'|'equipment')}><option value="material">Material</option><option value="equipment">Equipamento</option></select></label>
      <label><RequiredLabel>Nome</RequiredLabel><input className={addAttempted&&newName.trim().length<2?'field-invalid':''} value={newName} onChange={event=>setNewName(event.target.value)} placeholder="Ex.: Tubulação adicional"/>{addAttempted&&newName.trim().length<2&&<small className="field-error">Informe o nome do item.</small>}</label>
      <label><span className="field-label-row"><span>Descrição</span><span className="optional-label">Opcional</span></span><input value={newDescription} onChange={event=>setNewDescription(event.target.value)} placeholder="Quando é usado ou cobrado"/></label>
      <div className="form-grid"><label><RequiredLabel>Preço (R$)</RequiredLabel><input className={addAttempted&&parseMoney(newPrice)===null?'field-invalid':''} inputMode="decimal" value={newPrice} onChange={event=>setNewPrice(event.target.value)} placeholder="0,00"/>{addAttempted&&parseMoney(newPrice)===null&&<small className="field-error">Informe o preço.</small>}</label><label><RequiredLabel>Unidade</RequiredLabel><select value={newUnit} onChange={event=>setNewUnit(event.target.value)}>{unitOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
      <button className="primary-button" type="button" disabled={create.isPending} onClick={()=>void add()}>{create.isPending?'Adicionando…':'Adicionar à lista'}</button>
    </div>}

    <section className="catalog-section" aria-labelledby="materials-title">
      <div className="section-title-row"><div><span className="eyebrow">Cobrança adicional</span><h2 id="materials-title">Materiais</h2></div></div>
      <div className="catalog-table-list">
        {activeMaterials.map(item=>{
          const draft=drafts[item.id]??toDraft(item)
          const invalidName=draft.name.trim().length<2,invalidPrice=parseMoney(draft.price)===null,invalidUnit=!draft.unit
          return <article className="catalog-table-row catalog-table-row--material" key={item.id}>
            <div><RequiredLabel>Item</RequiredLabel><input aria-label="Nome" className={saveAttempted&&invalidName?'field-invalid':''} value={draft.name} disabled={!canEdit} onChange={event=>setDrafts(current=>({...current,[item.id]:{...draft,name:event.target.value}}))}/><span className="catalog-kind">Material</span>{saveAttempted&&invalidName&&<small className="field-error">Informe o nome do item.</small>}</div>
            <div><span className="field-label-row"><span>Descrição</span><span className="optional-label">Opcional</span></span><input aria-label="Descrição" value={draft.description} disabled={!canEdit} onChange={event=>setDrafts(current=>({...current,[item.id]:{...draft,description:event.target.value}}))}/></div>
            <div className="catalog-material-fields">
              <label><RequiredLabel>Preço (R$)</RequiredLabel><input aria-label="Preço" className={saveAttempted&&invalidPrice?'field-invalid':''} inputMode="decimal" value={draft.price} disabled={!canEdit} onChange={event=>setDrafts(current=>({...current,[item.id]:{...draft,price:event.target.value}}))} placeholder="0,00"/>{saveAttempted&&invalidPrice&&<small className="field-error">Informe o preço.</small>}</label>
              <label><RequiredLabel>Unidade</RequiredLabel><select aria-label="Unidade" className={saveAttempted&&invalidUnit?'field-invalid':''} value={draft.unit} disabled={!canEdit} onChange={event=>setDrafts(current=>({...current,[item.id]:{...draft,unit:event.target.value}}))}>{unitOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select>{saveAttempted&&invalidUnit&&<small className="field-error">Selecione a unidade.</small>}</label>
            </div>
            {canEdit&&<button className="catalog-icon-danger" type="button" aria-label={`Excluir ${item.name}`} disabled={remove.isPending} onClick={()=>remove.mutate(item.id)}><Trash2 size={17}/></button>}
          </article>
        })}
        {!activeMaterials.length&&<p className="settings-empty">{optedOut?'Nenhum material é cobrado separadamente. Os equipamentos de referência não foram alterados.':'Nenhum material cadastrado.'}</p>}
      </div>
    </section>

    <section className="catalog-section equipment-catalog" aria-labelledby="equipment-title">
      <div className="section-title-row"><div><span className="eyebrow">Referências da empresa</span><h2 id="equipment-title">Equipamentos</h2><p>{equipmentReferences.length} configurações disponíveis. Preço é opcional e nunca será inventado pelo assistente.</p></div></div>
      <div className="equipment-catalog-grid">
        {equipmentReferences.map(item=>{
          const draft=drafts[item.id]??toDraft(item)
          const details=item.equipment_details
          const invalidPrice=!!draft.price.trim()&&parseMoney(draft.price)===null
          return <article className={`equipment-catalog-card${draft.active?'':' is-inactive'}`} key={item.id}>
            {details?.image_url&&<img src={details.image_url} alt={details.image_alt??`Imagem de referência de ${item.name}`} loading="lazy" referrerPolicy="no-referrer"/>}
            <div className="equipment-catalog-card__body">
              <div className="equipment-catalog-card__heading"><div><span className="catalog-kind">{details?.brand??'Equipamento'}</span><h3>{item.name}</h3></div><span className={`equipment-status${draft.active?' is-active':''}`}>{draft.active?'Ativo':'Inativo'}</span></div>
              {details&&<div className="equipment-facts"><span>{details.capacity_btu.toLocaleString('pt-BR')} BTU/h</span><span>{details.inverter?'Inverter':'Convencional'}</span><span>{cycleLabel(details.cycles)}</span>{details.voltage&&<span>{details.voltage}</span>}</div>}
              {item.description&&<p>{item.description}</p>}
              {details&&<dl className="equipment-technical-details">
                <div><dt>Linha</dt><dd>{details.line}</dd></div>
                {details.model_sku&&<div><dt>Modelo</dt><dd>{details.model_sku}</dd></div>}
                {details.indoor_unit_dimensions&&<div><dt>Evaporadora</dt><dd>{details.indoor_unit_dimensions}</dd></div>}
                {details.outdoor_unit_dimensions&&<div><dt>Condensadora</dt><dd>{details.outdoor_unit_dimensions}</dd></div>}
              </dl>}
              <div className="equipment-commercial-fields">
                <label><span className="field-label-row"><span>Preço da empresa (R$)</span><span className="optional-label">Opcional</span></span><input aria-label={`Preço de ${item.name}`} className={saveAttempted&&invalidPrice?'field-invalid':''} inputMode="decimal" value={draft.price} disabled={!canEdit} onChange={event=>setDrafts(current=>({...current,[item.id]:{...draft,price:event.target.value}}))} placeholder="Confirmar com a empresa"/>{saveAttempted&&invalidPrice&&<small className="field-error">Informe um preço válido ou deixe vazio.</small>}</label>
                <label><RequiredLabel>Unidade</RequiredLabel><select aria-label={`Unidade de ${item.name}`} value={draft.unit} disabled={!canEdit} onChange={event=>setDrafts(current=>({...current,[item.id]:{...draft,unit:event.target.value}}))}>{unitOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              </div>
              <div className="equipment-catalog-card__actions">
                <label className="settings-checkbox"><input type="checkbox" checked={draft.active} disabled={!canEdit} onChange={event=>setDrafts(current=>({...current,[item.id]:{...draft,active:event.target.checked}}))}/><span><strong>Oferecer este equipamento</strong><small>Somente equipamentos ativos entram nas recomendações.</small></span></label>
                {details?.source_url&&<a href={details.source_url} target="_blank" rel="noreferrer">Fonte do fabricante <ExternalLink size={14}/></a>}
                {canEdit&&<button className="catalog-icon-danger" type="button" aria-label={`Remover ${item.name}`} disabled={remove.isPending||!draft.active} onClick={()=>remove.mutate(item.id)}><Trash2 size={17}/></button>}
              </div>
            </div>
          </article>
        })}
        {!equipmentReferences.length&&<p className="settings-empty">Nenhum equipamento de referência cadastrado.</p>}
      </div>
    </section>

    {saveAttempted&&catalogInvalid&&<p className="form-error" role="alert">Revise os campos destacados antes de salvar.</p>}
    {(create.isError||update.isError||remove.isError||updateBusiness.isError)&&<MutationError/>}
    {(update.isSuccess||updateBusiness.isSuccess)&&!catalogInvalid&&<p className="form-success">Catálogo salvo.</p>}
    {canEdit&&!!(activeMaterials.length||equipmentReferences.length)&&<button className="primary-button" type="button" disabled={update.isPending} onClick={()=>void save()}><Save size={17}/>{update.isPending?'Salvando…':'Salvar catálogo'}</button>}
  </Shell>
}

function toDraft(item:CatalogItem):Draft{return {kind:item.kind,name:item.name,description:item.description??'',price:item.price==null?'':String(item.price),unit:item.unit_label??'unidade',active:item.active}}
function parseMoney(value:string){if(!value.trim())return null;const parsed=Number(value.replace(',','.'));return Number.isFinite(parsed)&&parsed>=0?parsed:null}
function cycleLabel(cycles:Array<'cooling_only'|'heat_cool'>){return cycles.includes('heat_cool')?'Quente/frio':'Só frio'}
function MutationError(){return <p className="form-error" role="alert">Não foi possível salvar. Revise os dados e tente novamente.</p>}
function Shell({children}:{children:React.ReactNode}){return <div className="page-stack operational-page compact-page settings-page">{children}</div>}
