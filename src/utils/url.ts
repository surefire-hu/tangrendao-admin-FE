export function toAbsoluteUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const apiUrl = (import.meta as any).env?.VITE_API_URL as string | undefined
  if (apiUrl) {
    try {
      const { origin } = new URL(apiUrl)
      return origin + url
    } catch {}
  }
  return url
}
