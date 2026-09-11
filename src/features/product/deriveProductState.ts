import { entitlementsFor } from '../access/entitlements.ts'

export type ProductState = 'FREE_DEMO' | 'SETUP_PENDING' | 'ACTIVE' | 'CONNECTION_PENDING' | 'ERROR'

type AccessSnapshot = {access_mode:'free'|'paid'}
type ConnectionSnapshot = {status:'disconnected'|'pending'|'connected'|'error'}
type SetupSnapshot = {completed:number;total:number}

export function deriveProductState(
  membership?: AccessSnapshot,
  connection?: ConnectionSnapshot,
  query?: {isPending?: boolean; isError?: boolean},
  setup?: SetupSnapshot,
): ProductState {
  if (entitlementsFor(membership).usesDemoData) return 'FREE_DEMO'
  if (query?.isError) return 'ERROR'
  if (connection?.status === 'pending') return 'CONNECTION_PENDING'
  if (query?.isPending) return 'SETUP_PENDING'
  if (connection?.status === 'connected' && (!setup || setup.completed === setup.total)) return 'ACTIVE'
  if (connection?.status === 'error') return 'ERROR'
  return 'SETUP_PENDING'
}
