'use client'

import { useEffect, useState } from 'react'
import { GoAlert } from 'react-icons/go'
import { api, type LicenseInfo } from '../api/client'
import { EXPIRY_NUDGE_DAYS, expiryDaysLeft, formatDate } from '../lib/license'

/**
 * Amber banner warning that the active license is close to expiring (or already
 * lapsed). Self-fetches license info when none is supplied, so it can be dropped
 * into any chrome; pass `license` to reuse info a parent already loaded.
 *
 * @param license license info to use; when omitted the component fetches it.
 */
export default function LicenseExpiryNudge({
  license: licenseProp,
}: {
  license?: LicenseInfo | null
}) {
  const [fetched, setFetched] = useState<LicenseInfo | null>(null)
  const selfFetch = licenseProp === undefined

  useEffect(() => {
    if (!selfFetch) return
    let cancelled = false
    ;(async () => {
      const res = await api.getInfo()
      if (cancelled) return
      if (res.success) setFetched(res.data?.license ?? null)
    })()
    return () => {
      cancelled = true
    }
  }, [selfFetch])

  const license = selfFetch ? fetched : licenseProp
  const daysLeft = expiryDaysLeft(license)
  if (daysLeft === null || daysLeft > EXPIRY_NUDGE_DAYS) return null

  return (
    <div className="flex items-start gap-3 mb-6 p-4 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20">
      <GoAlert className="w-5 h-5 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          {daysLeft <= 0
            ? 'Your license has expired'
            : `Your license expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
        </p>
        <p className="text-sm text-amber-700 dark:text-amber-300/90 mt-0.5">
          To get a new license, contact{' '}
          <a href="mailto:support@endee.io" className="underline hover:no-underline">
            support@endee.io
          </a>{' '}
          to avoid interruption
          {license?.end_date ? ` (expires ${formatDate(license.end_date)})` : ''}.
        </p>
      </div>
    </div>
  )
}
