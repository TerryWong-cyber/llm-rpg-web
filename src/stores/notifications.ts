import { computed, ref } from 'vue'
import { apiErrorMessage, isApiStatus } from '../api/client'

export type NoticeTone = 'info' | 'success' | 'warning' | 'error'

interface Notice {
  tone: NoticeTone
  message: string
}

const notice = ref<Notice | null>(null)
const sessionIssue = ref(false)

function show(message: string, tone: NoticeTone = 'info'): void {
  notice.value = { message, tone }
}

function clear(): void {
  notice.value = null
}

function capture(error: unknown, fallback: string, sessionScoped = false): string {
  const message = apiErrorMessage(error, fallback)
  notice.value = { message, tone: 'error' }
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
