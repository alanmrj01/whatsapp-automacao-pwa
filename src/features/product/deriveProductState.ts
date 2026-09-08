export type ProductState = 'FREE_DEMO' | 'SETUP_PENDING' | 'ACTIVE' | 'CONNECTION_PENDING' | 'ERROR'

type AccessSnapshot = {access_mode:'free'|'paid'}
type ConnectionSnapshot = {status:'disconnected'|'pending'|'connected'|'error'}

export function deriveProductState(
  membership?: AccessSnapshot,
  connection?: ConnectionSnapshot,
  query?: {isPending?: boolean; isError?: boolean},
): ProductState {
  if (membership?.access_mode === 'free') return 'FREE_DEMO'
  if (query?.isError) return 'ERROR'
  if (query?.isPending || connection?.status === 'pending') return 'CONNECTION_PENDING'
  if (connection?.status === 'connected') return 'ACTIVE'
  if (connection?.status === 'error') return 'ERROR'
  return 'SETUP_PENDING'
}
