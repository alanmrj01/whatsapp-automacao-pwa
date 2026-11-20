import { useEffect, useRef, useState, type FormEvent } from 'react'
import { validLeadWhatsApp } from '../../lib/leadWhatsApp'
import '../../styles/quiz-funnel.css'

export type QuizLeadContact = { name: string; phone: string }

type Props = {
  mode?: 'quiz' | 'signup'
  initialValue?: string
  onConfirm: (contact: QuizLeadContact) => Promise<void> | void
}

export function QuizLeadContactGate({ mode = 'quiz', initialValue = '', onConfirm }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState(initialValue)
  const [permission, setPermission] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    return () => { if (dialog.open) dialog.close() }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    if (mode === 'quiz' && name.trim().length < 2) {
      setError('Informe seu nome para ver o resultado.')
      return
    }
    if (!validLeadWhatsApp(phone)) {
      setError('Informe um WhatsApp brasileiro válido com DDD.')
      return
    }
    if (mode === 'quiz' && !permission) {
      setError('Confirme a autorização de contato para continuar.')
      return
    }
    setError('')
    setBusy(true)
    try {
      await onConfirm({ name: name.trim(), phone: phone.trim() })
    } catch {
      setError('Não foi possível salvar seu contato agora. Verifique a conexão e tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="quiz-lead-dialog"
      aria-labelledby="quiz-lead-dialog-title"
      onCancel={event => event.preventDefault()}
    >
      <form className="quiz-lead-dialog__form" onSubmit={event => { void submit(event) }}>
        <h2 id="quiz-lead-dialog-title">
          {mode === 'quiz' ? 'Veja seu Resultado' : 'Informe seu WhatsApp'}
        </h2>
        <p className="quiz-lead-dialog__subtitle">
          {mode === 'quiz' ? 'Preencha os campos para ver seu resultado.' : 'Informe seu contato para continuar o cadastro.'}
        </p>
        {mode === 'quiz' && (
          <input
            className="quiz-lead-dialog__input"
            type="text"
            autoComplete="name"
            maxLength={120}
            minLength={2}
            required
            autoFocus
            disabled={busy}
            value={name}
            onChange={event => { setName(event.target.value); setError('') }}
            placeholder="Seu nome"
            aria-label="Seu nome"
          />
        )}
        <input
          className="quiz-lead-dialog__input"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={24}
          required
          autoFocus={mode !== 'quiz'}
          disabled={busy}
          value={phone}
          onChange={event => { setPhone(event.target.value); setError('') }}
          placeholder="(12) 99999-9999"
          aria-label="Número do WhatsApp com DDD"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'quiz-lead-dialog-error' : 'quiz-lead-dialog-hint'}
        />
        {mode === 'quiz' && (
          <label className="quiz-lead-dialog__permission">
            <input
              type="checkbox"
              required
              checked={permission}
              disabled={busy}
              onChange={event => setPermission(event.target.checked)}
            />
            <span>Autorizo a Alovia a entrar em contato pelo WhatsApp sobre meu resultado.</span>
          </label>
        )}
        {error && <p className="quiz-lead-dialog__error" id="quiz-lead-dialog-error" role="alert">{error}</p>}
        <button className="quiz-lead-dialog__cta" type="submit" disabled={busy} aria-busy={busy}>
          {busy ? 'Salvando…' : mode === 'quiz' ? 'Ver Resultado' : 'Continuar cadastro'}
        </button>
        <small className="quiz-lead-dialog__hint" id="quiz-lead-dialog-hint">
          {mode === 'quiz'
            ? 'Nome e WhatsApp serão registrados pela Alovia para acompanhar sua experiência. O número não será exibido publicamente.'
            : 'O WhatsApp da empresa será conectado depois. Este é apenas seu contato.'}
        </small>
      </form>
    </dialog>
  )
}
