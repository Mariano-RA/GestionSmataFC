import { formatCurrency, getMonthName, normalizeName } from '@/lib/utils';

/**
 * Normaliza un teléfono al formato E.164 para WhatsApp (Argentina).
 * Devuelve null si el número no es válido o está vacío.
 */
export function normalizePhoneForWhatsApp(phone: string | null | undefined): string | null {
  if (!phone || !phone.trim()) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return null;
  if (digits.startsWith('54') && digits.length >= 12) return digits;
  if (digits.length === 10 && digits.startsWith('9')) return '54' + digits;
  if (digits.length === 11 && digits.startsWith('15')) return '54' + '9' + digits.slice(2);
  return digits;
}

/**
 * Arma el mensaje de recordatorio de deuda para enviar por WhatsApp.
 */
export function buildDebtReminderMessage(
  name: string,
  currentMonth: string,
  debtThisMonth: number,
  previousDebt: number
): string {
  const monthName = getMonthName(currentMonth);
  const totalDebt = debtThisMonth + previousDebt;
  let message = `Hola ${normalizeName(name)}, te recuerdo que tenés una cuota pendiente de ${formatCurrency(debtThisMonth)} correspondiente al mes de ${monthName}.`;
  if (previousDebt > 0) {
    message += ` Además tenés una deuda anterior de ${formatCurrency(previousDebt)}, lo que hace un total de ${formatCurrency(totalDebt)}.`;
  }
  message += ' ¡Gracias!';
  return message;
}

/**
 * Abre WhatsApp con el mensaje indicado.
 * Si el teléfono no es válido, llama a onNoPhone y no abre la ventana.
 */
export function openWhatsAppForDebtor(
  phone: string | null | undefined,
  message: string,
  onNoPhone: () => void
): void {
  const waNumber = normalizePhoneForWhatsApp(phone);
  if (waNumber) {
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${waNumber}?text=${encoded}`, '_blank', 'noopener,noreferrer');
  } else {
    onNoPhone();
  }
}
