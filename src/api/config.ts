function withoutTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

export const apiOrigin = withoutTrailingSlash(
  import.meta.env.VITE_RPG_API_BASE,
)

function deriveSocketOrigin(httpOrigin: string): string {
  const url = new URL(httpOrigin)
  if (url.protocol === 'https:') url.protocol = 'wss:'
  else if (url.protocol === 'http:') url.protocol = 'ws:'
  else throw new Error(`Unsupported API protocol: ${url.protocol}`)
  return withoutTrailingSlash(url.toString())
}

export const socketOrigin = withoutTrailingSlash(
  import.meta.env.VITE_RPG_WS_BASE || deriveSocketOrigin(apiOrigin),
)

export const ossOrigin = withoutTrailingSlash(
  import.meta.env.VITE_RPG_OSS_BASE,
)

export const ossBucket = import.meta.env.VITE_RPG_OSS_BUCKET || ''

export function resolveOssFileUrl(imageKey: string): string {
  if (!imageKey || !ossBucket) return ''
  const encodedKey = imageKey.split('/').map(encodeURIComponent).join('/')
  return `${ossOrigin}/file/${encodeURIComponent(ossBucket)}/${encodedKey}`
}

export function resolveSocketUrl(pathOrUrl: string): string {
  if (/^wss?:\/\//i.test(pathOrUrl)) return pathOrUrl
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  return `${socketOrigin}${path}`
}
