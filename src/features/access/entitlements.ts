import type { Membership, MembershipRole } from '../auth/types'

export const DEMO_DATA_NOTICE = 'Modo demonstração — dados ilustrativos para você visualizar como o ALOVIA funciona.'

export class UpgradeRequiredError extends Error {
  constructor() {
    super('Esta ação requer uma assinatura ativa.')
    this.name = 'UpgradeRequiredError'
  }
}

type EntitlementMembership = Pick<Membership, 'access_mode'> & Partial<Pick<Membership, 'role' | 'has_had_operational_access'>>

export function entitlementsFor(membership?: EntitlementMembership) {
  const isFree = membership?.access_mode === 'free'
  const isPaid = membership?.access_mode === 'paid'
  const role = membership?.role
  const hasOperationalHistory = isPaid || membership?.has_had_operational_access === true
  const isReadOnlyRetained = isFree && hasOperationalHistory

  return {
    isFree,
    isPaid,
    hasOperationalHistory,
    isReadOnlyRetained,
    // Only a business that has never operated with real data receives fixtures.
    usesDemoData: isFree && !hasOperationalHistory,
    // Former subscribers/admin-granted tenants keep reading their own real data.
    canReadOperationalData: isPaid || isReadOnlyRetained,
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
