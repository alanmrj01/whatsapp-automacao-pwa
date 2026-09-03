import { CircleAlert } from 'lucide-react'
import { PrimaryButton } from './PrimaryButton'

type ErrorStateProps = {
  onRetry?: () => void
}

export function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <div className="state-card" role="alert">
      <span className="state-card__icon state-card__icon--danger">
        <CircleAlert size={26} />
      </span>
      <h2>Não foi possível carregar</h2>
      <p>Tente novamente em alguns instantes.</p>
      {onRetry && <PrimaryButton onClick={onRetry}>Tentar novamente</PrimaryButton>}
    </div>
  )
}
