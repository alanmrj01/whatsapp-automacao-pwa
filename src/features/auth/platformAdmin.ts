import { api } from '../../lib/api'

export type PlatformBusiness = {
  id: string
  name: string
  timezone: string
  active: boolean
  owners: string[]
  whatsapp_status: 'disconnected' | 'pending' | 'connected' | 'error'
}

type PlatformBusinessList = { businesses: PlatformBusiness[] }

export type CreatePlatformBusiness = {
  name: string
  timezone: string
  owner_email: string
  owner_password: string
}

export async function listPlatformBusinesses() {
  return (await api.request<PlatformBusinessList>('/admin/businesses')).businesses
}

export async function createPlatformBusiness(payload: CreatePlatformBusiness, idempotencyKey: string) {
  return api.request<PlatformBusiness>('/admin/businesses', {
    method: 'POST',
    headers: {'Idempotency-Key': idempotencyKey},
    body: JSON.stringify(payload),
  })
}

export async function setPlatformBusinessActive(id: string, active: boolean) {
  return api.request<{id:string;active:boolean}>(`/admin/businesses/${id}/active`, {
    method: 'PATCH',
    body: JSON.stringify({active}),
  })
}
