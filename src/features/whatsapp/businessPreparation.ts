export type WhatsAppBusinessPreparationStep = 1 | 2 | 3

export type WhatsAppBusinessPreparationProgress = {
  step: WhatsAppBusinessPreparationStep
  backupConfirmed: boolean
  appReady: boolean
  businessReady: boolean
  updatedAt: number
}

const STORAGE_PREFIX='alovia:whatsapp-business-preparation:v1:'
const MAX_AGE_MS=30*24*60*60*1000

export const emptyWhatsAppBusinessPreparation = (): WhatsAppBusinessPreparationProgress => ({
  step:1,
  backupConfirmed:false,
  appReady:false,
  businessReady:false,
  updatedAt:Date.now(),
})

function keyFor(businessId:string){
  return `${STORAGE_PREFIX}${businessId}`
}

function validStep(value:unknown): value is WhatsAppBusinessPreparationStep {
  return value===1||value===2||value===3
}

export function loadWhatsAppBusinessPreparation(
  businessId:string|undefined|null,
): WhatsAppBusinessPreparationProgress|null {
  if(!businessId||typeof window==='undefined')return null
  try{
    const raw=window.localStorage.getItem(keyFor(businessId))
    if(!raw)return null
    const parsed=JSON.parse(raw) as Partial<WhatsAppBusinessPreparationProgress>
    if(!validStep(parsed.step)||typeof parsed.updatedAt!=='number'){
      window.localStorage.removeItem(keyFor(businessId))
      return null
    }
    if(Date.now()-parsed.updatedAt>MAX_AGE_MS){
      window.localStorage.removeItem(keyFor(businessId))
      return null
    }
    return {
      step:parsed.step,
      backupConfirmed:parsed.backupConfirmed===true,
      appReady:parsed.appReady===true,
      businessReady:parsed.businessReady===true,
      updatedAt:parsed.updatedAt,
    }
  }catch{
    return null
  }
}

export function saveWhatsAppBusinessPreparation(
  businessId:string|undefined|null,
  progress:Omit<WhatsAppBusinessPreparationProgress,'updatedAt'>,
){
  if(!businessId||typeof window==='undefined')return
  try{
    window.localStorage.setItem(
      keyFor(businessId),
      JSON.stringify({...progress,updatedAt:Date.now()}),
    )
  }catch{
    // Progress persistence is convenience only; never block the connection flow.
  }
}

export function clearWhatsAppBusinessPreparation(
  businessId:string|undefined|null,
){
  if(!businessId||typeof window==='undefined')return
  try{
    window.localStorage.removeItem(keyFor(businessId))
  }catch{
    // Nothing to recover when storage is unavailable.
  }
}
