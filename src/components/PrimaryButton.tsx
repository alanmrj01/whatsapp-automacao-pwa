import type { ButtonHTMLAttributes, ReactNode } from 'react'

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  icon?: ReactNode
  fullWidth?: boolean
}

export function PrimaryButton({
  children,
  icon,
  fullWidth = false,
  className = '',
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      className={`primary-button${fullWidth ? ' primary-button--full' : ''} ${className}`}
      type="button"
      {...props}
    >
      {children}
      {icon}
    </button>
  )
}
