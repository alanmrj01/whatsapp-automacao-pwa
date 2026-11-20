export function validLeadWhatsApp(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  const normalized = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits
  return (normalized.length === 12 || normalized.length === 13)
    && normalized.startsWith('55')
    && normalized[2] !== '0'
}
