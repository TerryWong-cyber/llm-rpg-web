import type { CombatClientMessage, CombatServerEvent } from '../contracts'
import { resolveSocketUrl } from './config'

export interface CombatSocketHandlers {
  onEvent: (event: CombatServerEvent) => void
  onDisconnect: (event: CloseEvent) => void
  onMalformedMessage: () => void
}

export class CombatSocket {
  private socket: WebSocket | null = null
  private intentionalClose = false

  constructor(private readonly handlers: CombatSocketHandlers) {}

  async connect(pathOrUrl: string): Promise<void> {
    this.close()
    this.intentionalClose = false

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(resolveSocketUrl(pathOrUrl))
      this.socket = socket

      socket.onopen = () => resolve()
      socket.onerror = () => reject(new Error('无法建立战斗实时连接。'))
      socket.onmessage = (message) => {
        try {
          this.handlers.onEvent(JSON.parse(message.data) as CombatServerEvent)
        } catch {
          this.handlers.onMalformedMessage()
        }
      }
      socket.onclose = (event) => {
        this.socket = null
        if (!this.intentionalClose) this.handlers.onDisconnect(event)
      }
    })
  }

  send(message: CombatClientMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('战斗连接尚未就绪。')
    }
    this.socket.send(JSON.stringify(message))
  }

  close(): void {
    this.intentionalClose = true
    this.socket?.close()
    this.socket = null
  }
}
