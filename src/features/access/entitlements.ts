import type { Membership, MembershipRole } from '../auth/types'

export const DEMO_DATA_NOTICE = 'Modo demonstração — dados ilustrativos para você visualizar como o ALOVIA funciona.'

export class UpgradeRequiredError extends Error {
  constructor() {
    super('Esta ação requer um plano pago.')
    this.name = 'UpgradeRequiredError'
  }
}

type EntitlementMembership = Pick<Membership, 'access_mode'> & Partial<Pick<Membership, 'role'>>

export function entitlementsFor(membership?: EntitlementMembership) {
  const isPaid = membership?.access_mode === 'paid'
  const role = membership?.role
  return {
    isFree: membership?.access_mode === 'free',
    isPaid,
    usesDemoData: membership?.access_mode === 'free',
    canReadOperationalData: isPaid,
    canMutateOperationalData: isPaid && role !== 'viewer',
    canConfigureOperationalData: isPaid && canAdminister(role),
  }
}

export function requirePaidAccess(membership?: EntitlementMembership) {
  if (!entitlementsFor(membership).isPaid) throw new UpgradeRequiredError()
}

function canAdminister(role?: MembershipRole) {
  return role === 'owner' || role === 'admin'
}
