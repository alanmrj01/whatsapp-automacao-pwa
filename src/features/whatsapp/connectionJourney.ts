import type {
  WhatsAppConnection,
  WhatsAppConnectionJourneyState,
  WhatsAppConnectionNextAction,
} from './types'

export type WhatsAppConnectionJourney = {
  state: WhatsAppConnectionJourneyState
  requiresUserAction: boolean
  nextAction: WhatsAppConnectionNextAction
  title: string
  message: string
  ctaLabel?: string
}

function fallbackState(connection?: WhatsAppConnection | null): WhatsAppConnectionJourneyState {
  if (!connection || connection.status === 'disconnected') return 'not_started'
  if (connection.status === 'connected') return 'connected'
  if (connection.status === 'error') return 'error'
  if (
    connection.status === 'pending'
    && connection.mode === 'coexistence'
    && connection.review_status === 'rejected'
  ) return 'meta_review_rejected'
  return connection.pending_state === 'meta_review_pending'
    ? 'meta_review_pending'
    : connection.pending_state === 'meta_review_rejected'
      ? 'meta_review_rejected'
      : 'authorization_pending'
}

function fallbackAction(state: WhatsAppConnectionJourneyState): WhatsAppConnectionNextAction {
  if (state === 'not_started') return 'choose_mode'
  if (state === 'authorization_pending') return 'continue_authorization'
  if (state === 'meta_review_pending') return 'wait_for_meta_review'
  if (state === 'meta_review_rejected') return 'review_meta_rejection'
  if (state === 'error') return 'resolve_connection'
  return 'none'
}

const copy: Record<WhatsAppConnectionJourneyState, Pick<WhatsAppConnectionJourney, 'title' | 'message' | 'ctaLabel'>> = {
  not_started: {
    title: 'Agora vamos conectar seu WhatsApp',
    message: 'A Alovia vai conduzir você por cada etapa. Primeiro escolha como quer usar este número; depois abriremos a autorização oficial da Meta.',
    ctaLabel: 'Começar conexão',
  },
  authorization_pending: {
    title: 'Falta concluir a autorização com a Meta',
    message: 'Sua conexão já foi iniciada. Continue a etapa oficial da Meta; quando você voltar, a Alovia confere o resultado e mostra o próximo passo.',
    ctaLabel: 'Continuar com a Meta',
  },
  meta_review_pending: {
    title: 'Aguardando verificação da Meta',
    message: 'Sua parte está concluída. A solicitação já foi enviada e a Meta está analisando a conta. Não refaça a conexão; a Alovia acompanha o status e atualizará esta etapa quando houver mudança.',
  },
  meta_review_rejected: {
    title: 'A Meta não aprovou a verificação',
    message: 'A análise foi encerrada sem aprovação. Não refaça a conexão agora. Revise os dados da empresa e da conta na Meta antes de uma nova tentativa; a Alovia mantém este estado visível para você não perder o ponto em que parou.',
    ctaLabel: 'Ver orientação',
  },
  error: {
    title: 'Vamos resolver a conexão',
    message: 'A conexão não foi concluída. A Alovia vai levar você ao ponto correto para tentar novamente, sem pedir que repita etapas desnecessárias.',
    ctaLabel: 'Resolver conexão',
  },
  connected: {
    title: 'WhatsApp conectado',
    message: 'Conexão concluída. Este número já está pronto para operar com a Alovia.',
  },
}

export function deriveConnectionJourney(
  connection?: WhatsAppConnection | null,
): WhatsAppConnectionJourney {
  const state = connection?.journey_state ?? fallbackState(connection)
  const nextAction = connection?.next_action ?? fallbackAction(state)
  const requiresUserAction = connection?.requires_user_action
    ?? (nextAction !== 'wait_for_meta_review' && nextAction !== 'none')
  return {
    state,
    nextAction,
    requiresUserAction,
    ...copy[state],
  }
}
