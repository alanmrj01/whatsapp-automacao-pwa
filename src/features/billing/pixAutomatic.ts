import QRCode from 'qrcode'

export const PIX_STATUS_POLL_MS = 4_000
export const PIX_STATUS_MAX_POLLS = 900

export type CheckoutStatus = 'creating'|'active'|'paid'|'canceled'|'expired'|'failed'

export function isTerminalCheckoutStatus(status:CheckoutStatus) {
  return status === 'paid' || status === 'canceled' || status === 'expired' || status === 'failed'
}

export async function createPixQrDataUrl(payload:string) {
  if(!payload.trim())throw new Error('Pix payload is required')
  return QRCode.toDataURL(payload,{
    errorCorrectionLevel:'M',
    margin:2,
    width:280,
    color:{dark:'#101828',light:'#ffffff'},
  })
}

export async function copyPixPayload(
  payload:string,
  writeText:(value:string)=>Promise<void>=(value)=>navigator.clipboard.writeText(value),
) {
  if(!payload.trim())throw new Error('Pix payload is required')
  await writeText(payload)
}
