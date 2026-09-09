import { useAuth } from '../auth/useAuth'
import { useConnection } from '../whatsapp/useConnection'
import { useSetupStatus } from '../operations/api'
import { deriveProductState } from './deriveProductState'

export { deriveProductState }
export type { ProductState } from './deriveProductState'

export function useProductState() {
  const auth = useAuth()
  const connection = useConnection()
  const setup = useSetupStatus()
  const query = {isPending:connection.isPending||setup.isPending,isError:connection.isError||setup.isError}
  const state = deriveProductState(auth.membership, connection.data, query, setup.data)
  return {state, membership:auth.membership, connection, setup}
}
