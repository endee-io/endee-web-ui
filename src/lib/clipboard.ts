/**
 * Copies text to the clipboard.
 *
 * `navigator.clipboard` is only available in secure contexts (HTTPS or
 * localhost). When the app is served over plain HTTP (e.g. via an IP address),
 * it is `undefined`, so we fall back to the legacy execCommand approach.
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
    return
  }

  // Fallback for non-secure contexts.
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.top = '-9999px'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  try {
    const ok = document.execCommand('copy')
    if (!ok) throw new Error('Copy command failed')
  } finally {
    document.body.removeChild(textarea)
  }
}
