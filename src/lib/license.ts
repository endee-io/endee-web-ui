import type { LicenseInfo } from '../api/client'

/** Number of days before expiry at which we nudge the user to renew. */
export const EXPIRY_NUDGE_DAYS = 7

/** Colour + label for a license status value. */
export function statusBadge(status?: string): { label: string; className: string } {
  switch ((status || '').toLowerCase()) {
    case 'active':
    case 'valid':
      return {
        label: status!,
        className: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
      }
    case 'expired':
      return {
        label: 'Expired',
        className: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
      }
    default:
      return {
        label: status || 'Not Activated',
        className: 'bg-slate-100 text-slate-600 dark:bg-slate-600 dark:text-slate-300',
      }
  }
}

/** Parse a license date string into a Date, or null if unparseable. */
export function parseLicenseDate(value?: string): Date | null {
  if (!value) return null
  // License dates are UTC without a zone marker; append one so parsing is stable.
  const d = new Date(`${value.trim().replace(' ', 'T')}Z`)
  return isNaN(d.getTime()) ? null : d
}

/** Format a license date string as a date only (no time), e.g. "Jul 6, 2026". */
export function formatDate(value?: string): string {
  const d = parseLicenseDate(value)
  if (!d || isNaN(d.getTime())) return value || '—'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Whole days from now until `value`; negative if already past. Null if unparseable. */
export function daysUntil(value?: string): number | null {
  const d = parseLicenseDate(value)
  if (!d || isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

/**
 * Days until the license expires, but only when there is an active (non-expired)
 * license worth nudging about. Null when there's no license, it's already marked
 * expired, or the date is unparseable.
 */
export function expiryDaysLeft(license?: LicenseInfo | null): number | null {
  if (!license?.status) return null
  if (statusBadge(license.status).label === 'Expired') return null
  return daysUntil(license.end_date)
}
