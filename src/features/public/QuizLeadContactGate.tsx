import { useEffect, useRef, useState, type FormEvent } from 'react'
import { validLeadWhatsApp } from '../../lib/leadWhatsApp'
import '../../styles/quiz-funnel.css'

type Props = {
  mode?: 'quiz' | 'signup'
  initialValue?: string
  onConfirm: (phone: string) => void
}

export function QuizLeadContactGate({ mode = 'quiz', initialValue = '', onConfirm }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [phone, setPhone] = useState(initialValue)
  const [error, setError] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    return () => { if (dialog.open) dialog.close() }
  }, [])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validLeadWhatsApp(phone)) {
      setError('Informe um WhatsApp brasileiro válido com DDD.')
      return
    }
    setError('')
    onConfirm(phone.trim())
  }

  return (
    <dialog
      ref={dialogRef}
      className="quiz-lead-dialog"
      aria-labelledby="quiz-lead-dialog-title"
      onCancel={event => event.preventDefault()}
    >
      <form className="quiz-lead-dialog__form" onSubmit={submit}>
        <h2 id="quiz-lead-dialog-title">
          {mode === 'quiz' ? 'Veja seu Resultado' : 'Informe seu WhatsApp'}
        </h2>
        <p className="quiz-lead-dialog__subtitle">
          {mode === 'quiz' ? 'preencha o campo para ver seu resultado' : 'Informe seu contato para continuar o cadastro.'}
        </p>
        <input
          className="quiz-lead-dialog__input"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={24}
          required
          autoFocus
          value={phone}
          onChange={event => { setPhone(event.target.value); setError('') }}
          placeholder="(12) 99999-9999"
          aria-label="Número do WhatsApp com DDD"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'quiz-lead-dialog-error' : 'quiz-lead-dialog-hint'}
        />
        {error && <p className="quiz-lead-dialog__error" id="quiz-lead-dialog-error" role="alert">{error}</p>}
        <button className="quiz-lead-dialog__cta" type="submit">
          {mode === 'quiz' ? 'Ver Resultado' : 'Continuar cadastro'}
        </button>
        <small className="quiz-lead-dialog__hint" id="quiz-lead-dialog-hint">
          Seu número será associado à sua conta se você concluir o cadastro.
        </small>
      </form>
    </dialog>
  )
}
