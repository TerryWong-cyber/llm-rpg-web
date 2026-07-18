import { computed, ref } from 'vue'
import { apiErrorMessage, isApiStatus } from '../api/client'

export type NoticeTone = 'info' | 'success' | 'warning' | 'error'

interface Notice {
  tone: NoticeTone
  message: string
}

const notice = ref<Notice | null>(null)
const sessionIssue = ref(false)
let noticeTimer: ReturnType<typeof setTimeout> | null = null
let noticeVersion = 0

function show(message: string, tone: NoticeTone = 'info'): void {
  if (noticeTimer) clearTimeout(noticeTimer)
  const version = ++noticeVersion
  notice.value = { message, tone }
  noticeTimer = setTimeout(() => {
    if (noticeVersion === version) notice.value = null
    noticeTimer = null
  }, 3000)
}

function clear(): void {
  noticeVersion += 1
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = null
  notice.value = null
}

function capture(error: unknown, fallback: string, sessionScoped = false): string {
  const message = apiErrorMessage(error, fallback)
  show(message, 'error')
  if (sessionScoped && isApiStatus(error, 404)) sessionIssue.value = true
  return message
}

function clearSessionIssue(): void {
  sessionIssue.value = false
}

export function useNotificationsStore() {
  return {
    notice: computed(() => notice.value),
    sessionIssue: computed(() => sessionIssue.value),
    show,
    clear,
    capture,
    clearSessionIssue,
  }
}
