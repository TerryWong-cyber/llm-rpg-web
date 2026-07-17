import type { ApiErrorPayload, ValidationIssue } from '../contracts'
import { apiOrigin } from './config'

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly detail: ApiErrorPayload['detail'] | null,
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

function validationMessage(issues: ValidationIssue[]): string {
  return issues.map((issue) => issue.msg).filter(Boolean).join('；')
}

function messageFromDetail(detail: ApiErrorPayload['detail'] | null, fallback: string): string {
  if (typeof detail === 'string' && detail.trim()) return detail
  if (Array.isArray(detail)) return validationMessage(detail) || fallback
  return fallback
}

export function apiErrorMessage(error: unknown, fallback = '请求未能完成，请稍后再试。'): string {
  if (error instanceof ApiRequestError) return error.message
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function isApiStatus(error: unknown, status: number): boolean {
  return error instanceof ApiRequestError && error.status === status
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  query?: Record<string, string | number | boolean | null | undefined>
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`${apiOrigin}${path}`)
  Object.entries(options.query ?? {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined) url.searchParams.set(key, String(value))
  })

  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')

  let response: Response
  try {
    response = await fetch(url, {
      ...options,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch (error) {
    throw new ApiRequestError(
      error instanceof Error ? `无法连接冒险服务器：${error.message}` : '无法连接冒险服务器。',
      0,
      null,
    )
  }

  const raw = await response.text()
  const data = raw ? safeJson(raw) : null

  if (!response.ok) {
    const detail = isApiErrorPayload(data) ? data.detail : null
    const fallback = `服务器请求失败（${response.status}）`
    throw new ApiRequestError(messageFromDetail(detail, fallback), response.status, detail)
  }

  return data as T
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return typeof value === 'object' && value !== null && 'detail' in value
}
