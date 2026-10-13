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
    && (
      connection.onboarding_attempt_state === 'code_received'
      || connection.onboarding_attempt_state === 'completing'
    )
  ) return 'validating_connection'
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
  if (state === 'validating_connection') return 'wait_for_completion'
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
  validating_connection: {
    title: 'Finalizando sua conexão',
    message: 'A autorização já voltou da Meta. A Alovia está validando a conta, o número e a integração. Você não precisa repetir nenhuma etapa.',
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
    ?? (
      nextAction !== 'wait_for_meta_review'
      && nextAction !== 'wait_for_completion'
      && nextAction !== 'none'
    )
  if (state === 'error' && connection?.error_reason) {
    const errors = {
      authorization_incomplete: {
        title:'A autorização da Meta não foi concluída',
        message:'A Meta fechou a etapa sem devolver a autorização necessária. A tentativa foi encerrada com segurança e você pode iniciar outra.',
        ctaLabel:'Tentar novamente com a Meta',
      },
      onboarding_expired: {
        title:'A tentativa expirou',
        message:'A conexão anterior ficou sem progresso e foi encerrada automaticamente. Você pode começar uma nova tentativa sem carregar o estado antigo.',
        ctaLabel:'Iniciar nova tentativa',
      },
      provider_rejected: {
        title:'A Meta não validou esta autorização',
        message:'A autorização foi recusada ou não pôde ser validada pela Meta. Revise a conta usada no fluxo e tente novamente.',
        ctaLabel:'Tentar novamente',
      },
      provider_unavailable: {
        title:'A Meta está temporariamente indisponível',
        message:'O Alovia preservou o estado e encerrou esta tentativa sem deixar a conexão presa. Tente novamente em alguns instantes.',
        ctaLabel:'Tentar novamente',
      },
      onboarding_failed: {
        title:'A conexão não foi concluída',
        message:'A tentativa foi encerrada de forma segura. Você pode iniciar novamente sem herdar o estado anterior.',
        ctaLabel:'Tentar novamente',
      },
    } as const
    const presentation=errors[connection.error_reason]
    if (presentation) {
      return {state,nextAction,requiresUserAction,...presentation}
    }
  }
  return {
    state,
    nextAction,
    requiresUserAction,
    ...copy[state],
  }
}
