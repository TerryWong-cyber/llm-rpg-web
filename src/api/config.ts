// const DEFAULT_HTTP_ORIGIN = 'http://192.168.3.67:8008' //局域网内调试
const DEFAULT_HTTP_ORIGIN = 'https:game.toolup.cn'

function withoutTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

export const apiOrigin = withoutTrailingSlash(
  import.meta.env.VITE_RPG_API_BASE || DEFAULT_HTTP_ORIGIN,
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

export function resolveSocketUrl(pathOrUrl: string): string {
  if (/^wss?:\/\//i.test(pathOrUrl)) return pathOrUrl
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  return `${socketOrigin}${path}`
}
