import { ExternalLink, ImagePlus, Plus, RotateCcw, Save, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ErrorState } from '../../components/ErrorState'
import { InfoHelp } from '../../components/InfoHelp'
import { LoadingState } from '../../components/LoadingState'
import { RequiredLabel } from '../../components/RequiredLabel'
import { canConfigureWhatsApp } from '../auth/types'
import { useAuth } from '../auth/useAuth'
import { useBusiness, useCatalogItems, useCreateCatalogItem, useDeleteCatalogItem, useUpdateBusiness, useUpdateCatalogItem, useUploadCatalogItemImage } from '../operations/api'
import type { CatalogItem, EquipmentCatalogSpecifications } from '../operations/types'

const unitOptions=[
  {value:'metro',label:'Por metro'},
  {value:'unidade',label:'Por unidade'},
  {value:'kit',label:'Por kit'},
  {value:'valor fixo',label:'Valor fixo'},
] as const

type EquipmentSegment='modern'|'cost_benefit'|'economy'
type EquipmentCycle='cold'|'heat_cool'
type Draft={
  kind:'material'|'equipment'
  name:string
  description:string
  price:string
  unit:string
  active:boolean
  brand:string
  line:string
  capacity:string
  segment:EquipmentSegment
  cycle:EquipmentCycle
  inverter:boolean
  voltage:string
  indoorWidth:string
  indoorHeight:string
  indoorDepth:string
  outdoorWidth:string
  outdoorHeight:string
  outdoorDepth:string
  condenserForm:string
  imageUrl:string
  sourceUrl:string
}

export function MaterialsCatalogPage(){
  const items=useCatalogItems()
  const business=useBusiness()
  const create=useCreateCatalogItem()
  const update=useUpdateCatalogItem()
  const uploadImage=useUploadCatalogItemImage()
  const remove=useDeleteCatalogItem()
  const updateBusiness=useUpdateBusiness()
  const canEdit=canConfigureWhatsApp(useAuth().membership?.role)
  const [drafts,setDrafts]=useState<Record<string,Draft>>({})
  const [adding,setAdding]=useState(false)
  const [newDraft,setNewDraft]=useState<Draft>(()=>emptyDraft())
  const [newEquipmentImageFile,setNewEquipmentImageFile]=useState<File|null>(null)
  const [addAttempted,setAddAttempted]=useState(false)
  const [saveAttempted,setSaveAttempted]=useState(false)
  const [equipmentSearch,setEquipmentSearch]=useState('')
  const [brandFilter,setBrandFilter]=useState('all')
  const [cycleFilter,setCycleFilter]=useState<'all'|EquipmentCycle>('all')
  const [capacityFilter,setCapacityFilter]=useState('all')
  const [inverterFilter,setInverterFilter]=useState<'all'|'inverter'|'conventional'>('all')
  const [wifiFilter,setWifiFilter]=useState<'all'|'wifi'|'no_wifi'>('all')
  const [segmentFilter,setSegmentFilter]=useState<'all'|EquipmentSegment>('all')
  const [statusFilter,setStatusFilter]=useState<'all'|'active'|'inactive'>('all')

  const activeMaterials=useMemo(
    ()=>items.data?.items.filter(item=>(item.kind==='material'||item.preset_key==='condenser-bracket')&&item.active)??[],
    [items.data],
  )
  const equipmentReferences=useMemo(
    ()=>items.data?.items.filter(item=>item.kind==='equipment'&&item.preset_key!=='condenser-bracket')??[],
    [items.data],
  )

  const equipmentBrands=useMemo(
    ()=>[...new Set(equipmentReferences.map(item=>(drafts[item.id]?.brand??item.equipment_details?.brand??'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR')),
    [equipmentReferences,drafts],
  )
  const equipmentCapacities=useMemo(
    ()=>[...new Set(equipmentReferences.map(item=>Number(drafts[item.id]?.capacity??item.equipment_details?.capacity_btu??0)).filter(value=>Number.isFinite(value)&&value>0))].sort((a,b)=>a-b),
    [equipmentReferences,drafts],
  )
  const filteredEquipmentReferences=useMemo(()=>{
    const query=equipmentSearch.trim().toLocaleLowerCase('pt-BR')
    return equipmentReferences.filter(item=>{
      const draft=drafts[item.id]??toDraft(item)
      const details=item.equipment_details
      const searchable=[
        draft.name,
        draft.brand,
        draft.line,
        details?.model_sku??'',
      ].join(' ').toLocaleLowerCase('pt-BR')
      const wifi=details?.wifi===true||item.specifications.wifi===true||
        (Array.isArray(item.specifications.features)&&item.specifications.features.some(feature=>typeof feature==='string'&&feature.toLocaleLowerCase('pt-BR').replace(/[- ]/g,'').includes('wifi')))
      if(query&&!searchable.includes(query))return false
      if(brandFilter!=='all'&&draft.brand!==brandFilter)return false
      if(cycleFilter!=='all'&&draft.cycle!==cycleFilter)return false
      if(capacityFilter!=='all'&&draft.capacity!==capacityFilter)return false
      if(inverterFilter==='inverter'&&!draft.inverter)return false
      if(inverterFilter==='conventional'&&draft.inverter)return false
      if(wifiFilter==='wifi'&&!wifi)return false
      if(wifiFilter==='no_wifi'&&wifi)return false
      if(segmentFilter!=='all'&&draft.segment!==segmentFilter)return false
      if(statusFilter==='active'&&!draft.active)return false
      if(statusFilter==='inactive'&&draft.active)return false
      return true
    })
  },[
    equipmentReferences,drafts,equipmentSearch,brandFilter,cycleFilter,capacityFilter,
    inverterFilter,wifiFilter,segmentFilter,statusFilter,
  ])
  const equipmentFiltersActive=
    equipmentSearch.trim()!==''||brandFilter!=='all'||cycleFilter!=='all'||
    capacityFilter!=='all'||inverterFilter!=='all'||wifiFilter!=='all'||
    segmentFilter!=='all'||statusFilter!=='all'
  const clearEquipmentFilters=()=>{
    setEquipmentSearch('')
    setBrandFilter('all')
    setCycleFilter('all')
    setCapacityFilter('all')
    setInverterFilter('all')
    setWifiFilter('all')
    setSegmentFilter('all')
    setStatusFilter('all')
  }

  useEffect(()=>{
    if(!items.data)return
    setDrafts(Object.fromEntries(items.data.items.map(item=>[item.id,toDraft(item)])))
  },[items.data])

  if(items.isPending||business.isPending)return <Shell><LoadingState/></Shell>
  if(items.isError||business.isError||!items.data||!business.data)return <Shell><ErrorState onRetry={()=>{void items.refetch();void business.refetch()}}/></Shell>

  const optedOut=business.data.materials_catalog_reviewed&&!activeMaterials.length
  const materialDraftInvalid=(id:string)=>materialInvalid(drafts[id])
  const equipmentDraftInvalid=(id:string)=>equipmentInvalid(drafts[id])
  const catalogInvalid=
    activeMaterials.some(item=>materialDraftInvalid(item.id))||
    equipmentReferences.some(item=>equipmentDraftInvalid(item.id))

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
    if(newDraft.kind==='material'){
      const price=parseMoney(newDraft.price)
      if(materialInvalid(newDraft)||price===null)return
      await create.mutateAsync({
        kind:'material',
        name:newDraft.name.trim(),
        description:newDraft.description.trim()||null,
        price,
        unit_label:newDraft.unit,
      })
    }else{
      if(equipmentInvalid(newDraft))return
      const created=await create.mutateAsync({
        kind:'equipment',
        name:newDraft.name.trim(),
        description:newDraft.description.trim()||null,
        price:parseOptionalMoney(newDraft.price),
        unit_label:null,
        image_url:newDraft.imageUrl.trim()||null,
        source_url:newDraft.sourceUrl.trim()||null,
        specifications:equipmentSpecifications(newDraft),
      })
      try{
        if(newEquipmentImageFile)await uploadImage.mutateAsync({id:created.id,file:newEquipmentImageFile})
      }finally{
        setNewEquipmentImageFile(null)
      }
    }
    setNewDraft(emptyDraft())
    setAdding(false)
    setAddAttempted(false)
  }

  const save=async()=>{
    setSaveAttempted(true)
    if(catalogInvalid)return
    for(const item of activeMaterials){
      const draft=drafts[item.id]
      await update.mutateAsync({
        id:item.id,
        values:{
          kind:'material',
          name:draft.name.trim(),
          description:draft.description.trim()||null,
          price:parseMoney(draft.price)!,
          unit_label:draft.unit,
          active:true,
        },
      })
    }
    for(const item of equipmentReferences){
      const draft=drafts[item.id]
      await update.mutateAsync({
        id:item.id,
        values:{
          kind:'equipment',
          name:draft.name.trim(),
          description:draft.description.trim()||null,
          price:parseOptionalMoney(draft.price),
          unit_label:null,
          image_url:draft.imageUrl.trim()||null,
          source_url:draft.sourceUrl.trim()||null,
          specifications:{...item.specifications,...equipmentSpecifications(draft)},
          active:draft.active,
        },
      })
    }
    await updateBusiness.mutateAsync({materials_catalog_reviewed:true})
    setSaveAttempted(false)
  }

  return <Shell>
    <section className="operational-heading catalog-page-heading">
      <div><span className="eyebrow">Empresa</span><h1>Catálogo de equipamentos e materiais</h1></div>
      <div className="catalog-page-actions">
        {canEdit&&!!(activeMaterials.length||equipmentReferences.length)&&<button
          className="catalog-save-button"
          type="button"
          aria-label="Salvar catálogo"
          title="Salvar catálogo"
          disabled={update.isPending||updateBusiness.isPending}
          onClick={()=>void save()}
        ><Save size={21}/></button>}
        <InfoHelp title="Catálogo da empresa">Materiais cobrados e equipamentos de referência têm regras separadas. A recomendação usa somente equipamentos técnicos ativos da sua empresa.</InfoHelp>
      </div>
    </section>
    {canEdit&&<label className="settings-editor materials-opt-out">
      <span>Política de cobrança de materiais</span>
      <span className="settings-checkbox"><input type="checkbox" checked={optedOut} disabled={updateBusiness.isPending||remove.isPending} onChange={event=>void toggleOptOut(event.target.checked)}/><strong>Minha empresa não cobra materiais adicionais separadamente</strong></span>
      <small>Esta opção afeta somente materiais. Os equipamentos de referência permanecem no catálogo.</small>
    </label>}

    {canEdit&&<div className="catalog-toolbar"><button className="compact-button" type="button" onClick={()=>{setAdding(value=>!value);setAddAttempted(false)}}><Plus size={16}/>Adicionar material ou equipamento</button></div>}
    {canEdit&&adding&&<div className="settings-form settings-form--inline">
      <label><RequiredLabel>Tipo</RequiredLabel><select value={newDraft.kind} onChange={event=>setNewDraft(current=>({...current,kind:event.target.value as Draft['kind']}))}><option value="material">Material</option><option value="equipment">Equipamento</option></select></label>
      <label><RequiredLabel>Nome</RequiredLabel><input className={addAttempted&&newDraft.name.trim().length<2?'field-invalid':''} value={newDraft.name} onChange={event=>setNewDraft(current=>({...current,name:event.target.value}))} placeholder={newDraft.kind==='equipment'?'Ex.: LG Dual Inverter 12.000 BTU':'Ex.: Tubulação adicional'}/>{addAttempted&&newDraft.name.trim().length<2&&<small className="field-error">Informe o nome do item.</small>}</label>
      <label><span className="field-label-row"><span>Descrição</span><span className="optional-label">Opcional</span></span><input value={newDraft.description} onChange={event=>setNewDraft(current=>({...current,description:event.target.value}))} placeholder="Informações úteis para a empresa"/></label>

      {newDraft.kind==='material'?<>
        <div className="form-grid">
          <label><RequiredLabel>Preço (R$)</RequiredLabel><input className={addAttempted&&parseMoney(newDraft.price)===null?'field-invalid':''} inputMode="decimal" value={newDraft.price} onChange={event=>setNewDraft(current=>({...current,price:event.target.value}))} placeholder="0,00"/>{addAttempted&&parseMoney(newDraft.price)===null&&<small className="field-error">Informe o preço.</small>}</label>
          <label><RequiredLabel>Unidade</RequiredLabel><select value={newDraft.unit} onChange={event=>setNewDraft(current=>({...current,unit:event.target.value}))}>{unitOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        </div>
      </>:<>
        <EquipmentEditor draft={newDraft} setDraft={value=>setNewDraft(value)} attempted={addAttempted}/>
        <EquipmentPhotoField
          imageUrl={newDraft.imageUrl}
          fileName={newEquipmentImageFile?.name}
          disabled={create.isPending||uploadImage.isPending}
          onFile={setNewEquipmentImageFile}
        />
      </>}

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
      <div className="section-title-row"><div><span className="eyebrow">Referências da empresa</span><h2 id="equipment-title">Equipamentos</h2><p>{equipmentReferences.length} configurações cadastradas. Os preços padrão são referências editáveis e o assistente usa somente o valor salvo pela empresa.</p></div></div>

      <div className="equipment-filter-panel" role="search" aria-label="Buscar e filtrar equipamentos">
        <label className="equipment-filter-search">
          <span>Buscar equipamento</span>
          <div><Search size={17}/><input value={equipmentSearch} onChange={event=>setEquipmentSearch(event.target.value)} placeholder="Nome, marca, linha ou modelo"/></div>
        </label>
        <div className="equipment-filter-grid">
          <label><span>Marca</span><select value={brandFilter} onChange={event=>setBrandFilter(event.target.value)}><option value="all">Todas</option>{equipmentBrands.map(brand=><option key={brand} value={brand}>{brand}</option>)}</select></label>
          <label><span>Ciclo</span><select value={cycleFilter} onChange={event=>setCycleFilter(event.target.value as 'all'|EquipmentCycle)}><option value="all">Todos</option><option value="cold">Só frio</option><option value="heat_cool">Quente/frio</option></select></label>
          <label><span>Capacidade</span><select value={capacityFilter} onChange={event=>setCapacityFilter(event.target.value)}><option value="all">Todos os BTUs</option>{equipmentCapacities.map(capacity=><option key={capacity} value={String(capacity)}>{capacity.toLocaleString('pt-BR')} BTU/h</option>)}</select></label>
          <label><span>Tecnologia</span><select value={inverterFilter} onChange={event=>setInverterFilter(event.target.value as typeof inverterFilter)}><option value="all">Todas</option><option value="inverter">Inverter</option><option value="conventional">Convencional</option></select></label>
          <label><span>Wi-Fi</span><select value={wifiFilter} onChange={event=>setWifiFilter(event.target.value as typeof wifiFilter)}><option value="all">Todos</option><option value="wifi">Com Wi-Fi</option><option value="no_wifi">Sem Wi-Fi</option></select></label>
          <label><span>Perfil</span><select value={segmentFilter} onChange={event=>setSegmentFilter(event.target.value as 'all'|EquipmentSegment)}><option value="all">Todos</option><option value="modern">Mais moderno</option><option value="cost_benefit">Custo-benefício</option><option value="economy">Maior economia</option></select></label>
          <label><span>Status</span><select value={statusFilter} onChange={event=>setStatusFilter(event.target.value as typeof statusFilter)}><option value="all">Todos</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select></label>
        </div>
        <div className="equipment-filter-summary">
          <span><strong>{filteredEquipmentReferences.length}</strong> de {equipmentReferences.length} equipamentos exibidos</span>
          {equipmentFiltersActive&&<button type="button" onClick={clearEquipmentFilters}><RotateCcw size={15}/>Limpar filtros</button>}
        </div>
      </div>

      <div className="equipment-catalog-grid">
        {filteredEquipmentReferences.map(item=>{
          const draft=drafts[item.id]??toDraft(item)
          const details=item.equipment_details
          const invalid=equipmentInvalid(draft)
          return <article className={`equipment-catalog-card${draft.imageUrl?' has-image':''}${draft.active?'':' is-inactive'}`} key={item.id}>
            {draft.imageUrl&&<img src={draft.imageUrl} alt={details?.image_alt??`Imagem de referência de ${item.name}`} loading="lazy" referrerPolicy="no-referrer"/>}
            <div className="equipment-catalog-card__body">
              <div className="equipment-catalog-card__heading"><div><span className="catalog-kind">{draft.brand||'Equipamento'}</span><h3>{draft.name}</h3></div><span className={`equipment-status${draft.active?' is-active':''}`}>{draft.active?'Ativo':'Inativo'}</span></div>
              {details&&<div className="equipment-facts"><span>{details.capacity_btu.toLocaleString('pt-BR')} BTU/h</span><span>{details.inverter?'Inverter':'Convencional'}</span><span>{cycleLabel(details.cycles)}</span>{details.voltage&&<span>{details.voltage}</span>}</div>}
              {draft.description&&<p>{draft.description}</p>}

              {canEdit&&<details>
                <summary>Editar dados técnicos</summary>
                <div className="settings-form">
                  <label><RequiredLabel>Nome comercial</RequiredLabel><input value={draft.name} onChange={event=>patchDraft(item.id,draft,{name:event.target.value},setDrafts)}/></label>
                  <label><span className="field-label-row"><span>Descrição</span><span className="optional-label">Opcional</span></span><input value={draft.description} onChange={event=>patchDraft(item.id,draft,{description:event.target.value},setDrafts)}/></label>
                  <EquipmentEditor draft={draft} setDraft={value=>setDrafts(current=>({...current,[item.id]:value}))} attempted={saveAttempted}/>
                </div>
              </details>}

              <div className="equipment-commercial-fields">
                <label><span className="field-label-row"><span>Preço da empresa (R$)</span><span className="optional-label">Editável</span></span><input aria-label={`Preço de ${item.name}`} className={saveAttempted&&draft.price.trim()!==''&&parseMoney(draft.price)===null?'field-invalid':''} inputMode="decimal" value={draft.price} disabled={!canEdit} onChange={event=>patchDraft(item.id,draft,{price:event.target.value},setDrafts)} placeholder="Confirmar com a empresa"/></label>
              </div>
              {canEdit&&<EquipmentPhotoField
                imageUrl={draft.imageUrl}
                disabled={uploadImage.isPending}
                onFile={file=>{void uploadImage.mutateAsync({id:item.id,file}).then(updated=>setDrafts(current=>({...current,[item.id]:toDraft(updated)})))}}
              />}
              {saveAttempted&&invalid&&<p className="field-error">Preencha marca, linha, BTU, ciclo e os demais campos técnicos obrigatórios. Preço pode ficar vazio.</p>}
              <div className="equipment-catalog-card__actions">
                <label className="settings-checkbox"><input type="checkbox" checked={draft.active} disabled={!canEdit} onChange={event=>patchDraft(item.id,draft,{active:event.target.checked},setDrafts)}/><span><strong>Oferecer este equipamento</strong><small>Somente equipamentos ativos e tecnicamente válidos entram nas recomendações.</small></span></label>
                {draft.sourceUrl&&<a href={draft.sourceUrl} target="_blank" rel="noreferrer">Fonte do fabricante <ExternalLink size={14}/></a>}
                {canEdit&&<button className="catalog-icon-danger" type="button" aria-label={`Remover ${item.name}`} disabled={remove.isPending||!draft.active} onClick={()=>remove.mutate(item.id)}><Trash2 size={17}/></button>}
              </div>
            </div>
          </article>
        })}
        {!equipmentReferences.length&&<p className="settings-empty">Nenhum equipamento de referência cadastrado.</p>}
        {!!equipmentReferences.length&&!filteredEquipmentReferences.length&&<p className="settings-empty equipment-filter-empty">Nenhum equipamento corresponde aos filtros selecionados.</p>}
      </div>
    </section>

    {saveAttempted&&catalogInvalid&&<p className="form-error" role="alert">Revise os campos destacados antes de salvar.</p>}
    {(create.isError||update.isError||uploadImage.isError||remove.isError||updateBusiness.isError)&&<MutationError/>}
    {(update.isSuccess||updateBusiness.isSuccess)&&!catalogInvalid&&<p className="form-success">Catálogo salvo.</p>}
  </Shell>
}

function EquipmentEditor({draft,setDraft,attempted}:{draft:Draft;setDraft:(draft:Draft)=>void;attempted:boolean}){
  const capacity=Number(draft.capacity)
  const requiredInvalid=attempted&&(draft.brand.trim().length<2||draft.line.trim().length<2||!Number.isInteger(capacity)||capacity<1000)
  const optionalPriceInvalid=attempted&&draft.price.trim()!==''&&parseMoney(draft.price)===null
  const indoorInvalid=attempted&&!dimensionPairValid(draft.indoorWidth,draft.indoorHeight,draft.indoorDepth)
  const outdoorInvalid=attempted&&!dimensionPairValid(draft.outdoorWidth,draft.outdoorHeight,draft.outdoorDepth)
  return <>
    <div className="form-grid">
      <label><RequiredLabel>Marca</RequiredLabel><input className={requiredInvalid&&draft.brand.trim().length<2?'field-invalid':''} value={draft.brand} onChange={event=>setDraft({...draft,brand:event.target.value})} placeholder="Ex.: LG"/></label>
      <label><RequiredLabel>Linha</RequiredLabel><input className={requiredInvalid&&draft.line.trim().length<2?'field-invalid':''} value={draft.line} onChange={event=>setDraft({...draft,line:event.target.value})} placeholder="Ex.: Dual Inverter"/></label>
      <label><RequiredLabel>Capacidade (BTU/h)</RequiredLabel><input className={requiredInvalid&&(!Number.isInteger(capacity)||capacity<1000)?'field-invalid':''} type="number" min={1000} step={1000} value={draft.capacity} onChange={event=>setDraft({...draft,capacity:event.target.value})} placeholder="12000"/></label>
      <label><RequiredLabel>Perfil</RequiredLabel><select value={draft.segment} onChange={event=>setDraft({...draft,segment:event.target.value as EquipmentSegment})}><option value="modern">Mais moderno</option><option value="cost_benefit">Custo-benefício</option><option value="economy">Maior economia</option></select></label>
      <label><RequiredLabel>Ciclo</RequiredLabel><select value={draft.cycle} onChange={event=>setDraft({...draft,cycle:event.target.value as EquipmentCycle})}><option value="cold">Só frio</option><option value="heat_cool">Quente/frio</option></select></label>
      <label><span>Voltagem</span><input value={draft.voltage} onChange={event=>setDraft({...draft,voltage:event.target.value})} placeholder="220"/></label>
    </div>
    <label className="settings-checkbox"><input type="checkbox" checked={draft.inverter} onChange={event=>setDraft({...draft,inverter:event.target.checked})}/><span><strong>Inverter</strong><small>Marque quando o equipamento usar tecnologia inverter.</small></span></label>
    <div className="form-grid">
      <label><span>Evaporadora — largura (cm)</span><input inputMode="decimal" value={draft.indoorWidth} onChange={event=>setDraft({...draft,indoorWidth:event.target.value})}/></label>
      <label><span>Evaporadora — altura (cm)</span><input inputMode="decimal" value={draft.indoorHeight} onChange={event=>setDraft({...draft,indoorHeight:event.target.value})}/></label>
      <label><span>Evaporadora — profundidade (cm)</span><input inputMode="decimal" value={draft.indoorDepth} onChange={event=>setDraft({...draft,indoorDepth:event.target.value})}/></label>
      <label><span>Condensadora — largura (cm)</span><input inputMode="decimal" value={draft.outdoorWidth} onChange={event=>setDraft({...draft,outdoorWidth:event.target.value})}/></label>
      <label><span>Condensadora — altura (cm)</span><input inputMode="decimal" value={draft.outdoorHeight} onChange={event=>setDraft({...draft,outdoorHeight:event.target.value})}/></label>
      <label><span>Condensadora — profundidade (cm)</span><input inputMode="decimal" value={draft.outdoorDepth} onChange={event=>setDraft({...draft,outdoorDepth:event.target.value})}/></label>
    </div>
    {(indoorInvalid||outdoorInvalid)&&<small className="field-error">Quando informar dimensões, preencha largura e altura com valores válidos. Profundidade é opcional.</small>}
    <div className="form-grid">
      <label><span>Formato da condensadora</span><select value={draft.condenserForm} onChange={event=>setDraft({...draft,condenserForm:event.target.value})}><option value="unknown">Não informado</option><option value="square">Quadrada/retangular</option><option value="round">Redonda/cilíndrica</option></select></label>
      <label><span className="field-label-row"><span>Preço (R$)</span><span className="optional-label">Opcional</span></span><input className={optionalPriceInvalid?'field-invalid':''} inputMode="decimal" value={draft.price} onChange={event=>setDraft({...draft,price:event.target.value})} placeholder="Confirmar com a empresa"/></label>
      <label><span className="field-label-row"><span>URL alternativa da foto (HTTPS)</span><span className="optional-label">Opcional</span></span><input value={draft.imageUrl} onChange={event=>setDraft({...draft,imageUrl:event.target.value})} placeholder="https://..."/></label>
      <label><span className="field-label-row"><span>Fonte/fabricante HTTPS</span><span className="optional-label">Opcional</span></span><input value={draft.sourceUrl} onChange={event=>setDraft({...draft,sourceUrl:event.target.value})} placeholder="https://..."/></label>
    </div>
  </>
}

function EquipmentPhotoField({
  imageUrl,fileName,onFile,disabled,
}:{
  imageUrl:string
  fileName?:string
  onFile:(file:File)=>void
  disabled:boolean
}){
  return <div className="equipment-photo-field">
    <div className="field-label-row"><span>Foto do equipamento</span><span className="optional-label">JPG, PNG ou WebP · até 5 MB</span></div>
    <div className="equipment-photo-controls">
      <label className={`compact-button equipment-photo-upload${disabled?' is-disabled':''}`}>
        <ImagePlus size={16}/>
        <span>{imageUrl?'Trocar foto':'Adicionar foto'}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled}
          onChange={event=>{
            const file=event.currentTarget.files?.[0]
            event.currentTarget.value=''
            if(file)onFile(file)
          }}
        />
      </label>
      {fileName&&<small className="equipment-photo-file">{fileName}</small>}
      {imageUrl&&<a className="equipment-photo-link" href={imageUrl} target="_blank" rel="noreferrer">Visualizar foto <ExternalLink size={14}/></a>}
    </div>
  </div>
}

function emptyDraft():Draft{
  return {
    kind:'material',name:'',description:'',price:'',unit:'unidade',active:true,
    brand:'',line:'',capacity:'',segment:'cost_benefit',cycle:'cold',inverter:true,
    voltage:'220',indoorWidth:'',indoorHeight:'',indoorDepth:'',
    outdoorWidth:'',outdoorHeight:'',outdoorDepth:'',condenserForm:'unknown',
    imageUrl:'',sourceUrl:'',
  }
}

function toDraft(item:CatalogItem):Draft{
  const specs=item.specifications??{}
  return {
    ...emptyDraft(),
    kind:item.kind,
    name:item.name,
    description:item.description??'',
    price:item.price==null?'':String(item.price),
    unit:item.unit_label??'unidade',
    active:item.active,
    brand:specs.brand??item.equipment_details?.brand??'',
    line:specs.line??item.equipment_details?.line??'',
    capacity:specs.capacity_btu==null?'':String(specs.capacity_btu),
    segment:specs.segment??item.equipment_details?.segment??'cost_benefit',
    cycle:specs.cycles?.includes('heat_cool')?'heat_cool':'cold',
    inverter:specs.inverter??item.equipment_details?.inverter??false,
    voltage:specs.voltage_v==null?(specs.voltage??''):String(specs.voltage_v),
    indoorWidth:numberText(specs.indoor_dimensions_cm?.width),
    indoorHeight:numberText(specs.indoor_dimensions_cm?.height),
    indoorDepth:numberText(specs.indoor_dimensions_cm?.depth),
    outdoorWidth:numberText(specs.outdoor_dimensions_cm?.width),
    outdoorHeight:numberText(specs.outdoor_dimensions_cm?.height),
    outdoorDepth:numberText(specs.outdoor_dimensions_cm?.depth),
    condenserForm:specs.condenser_form??'unknown',
    imageUrl:item.image_url??'',
    sourceUrl:item.source_url??'',
  }
}

function equipmentSpecifications(draft:Draft):EquipmentCatalogSpecifications{
  const voltage=optionalPositiveNumber(draft.voltage)
  return {
    brand:draft.brand.trim(),
    line:draft.line.trim(),
    capacity_btu:Number(draft.capacity),
    inverter:draft.inverter,
    segment:draft.segment,
    cycles:draft.cycle==='heat_cool'?['cold','heat_cool']:['cold'],
    voltage_v:voltage,
    indoor_dimensions_cm:dimensionValue(draft.indoorWidth,draft.indoorHeight,draft.indoorDepth),
    outdoor_dimensions_cm:dimensionValue(draft.outdoorWidth,draft.outdoorHeight,draft.outdoorDepth),
    condenser_form:draft.condenserForm||'unknown',
  }
}

function materialInvalid(draft:Draft|undefined){
  return !draft||draft.name.trim().length<2||parseMoney(draft.price)===null||!draft.unit
}

function equipmentInvalid(draft:Draft|undefined){
  if(!draft)return true
  const capacity=Number(draft.capacity)
  return draft.name.trim().length<2||
    draft.brand.trim().length<2||
    draft.line.trim().length<2||
    !Number.isInteger(capacity)||
    capacity<1000||
    (draft.price.trim()!==''&&parseMoney(draft.price)===null)||
    !dimensionPairValid(draft.indoorWidth,draft.indoorHeight,draft.indoorDepth)||
    !dimensionPairValid(draft.outdoorWidth,draft.outdoorHeight,draft.outdoorDepth)||
    !optionalHttpsUrlValid(draft.imageUrl)||
    !optionalHttpsUrlValid(draft.sourceUrl)
}

function dimensionPairValid(width:string,height:string,depth:string){
  if(!width.trim()&&!height.trim()&&!depth.trim())return true
  return optionalPositiveNumber(width)!==null&&optionalPositiveNumber(height)!==null&&(!depth.trim()||optionalPositiveNumber(depth)!==null)
}

function dimensionValue(width:string,height:string,depth:string){
  const w=optionalPositiveNumber(width),h=optionalPositiveNumber(height),d=optionalPositiveNumber(depth)
  if(w===null||h===null)return null
  return d===null?{width:w,height:h}:{width:w,height:h,depth:d}
}

function optionalPositiveNumber(value:string){
  if(!value.trim())return null
  const parsed=Number(value.replace(',','.'))
  return Number.isFinite(parsed)&&parsed>0?parsed:null
}

function optionalHttpsUrlValid(value:string){
  if(!value.trim())return true
  try{return new URL(value).protocol==='https:'}catch{return false}
}

function patchDraft(id:string,draft:Draft,values:Partial<Draft>,setDrafts:React.Dispatch<React.SetStateAction<Record<string,Draft>>>){
  setDrafts(current=>({...current,[id]:{...draft,...values}}))
}

function numberText(value:number|undefined){return value==null?'':String(value)}
function parseMoney(value:string){if(!value.trim())return null;const parsed=Number(value.replace(',','.'));return Number.isFinite(parsed)&&parsed>=0?parsed:null}
function parseOptionalMoney(value:string){return value.trim()===''?null:parseMoney(value)}
function cycleLabel(cycles:Array<'cooling_only'|'heat_cool'>){return cycles.includes('heat_cool')?'Quente/frio':'Só frio'}
function MutationError(){return <p className="form-error" role="alert">Não foi possível salvar. Revise os dados e tente novamente.</p>}
function Shell({children}:{children:React.ReactNode}){return <div className="page-stack operational-page compact-page settings-page catalog-settings-page">{children}</div>}
