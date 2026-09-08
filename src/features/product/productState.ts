import { useAuth } from '../auth/useAuth'
import { useConnection } from '../whatsapp/useConnection'
import { deriveProductState } from './deriveProductState'

export { deriveProductState }
export type { ProductState } from './deriveProductState'

export function useProductState() {
  const auth = useAuth()
  const connection = useConnection()
  const state = deriveProductState(auth.membership, connection.data, connection)
  return {state, membership:auth.membership, connection}
}
