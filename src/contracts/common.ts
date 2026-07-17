export type CatalogId = string

export type ItemType = 'weapon' | 'armor' | 'item' | 'material'
export type MapScale = 'small' | 'medium' | 'large' | 'custom'
export type GameMode = 'WAITING' | 'PvE' | 'PvP'

export interface ValidationIssue {
  type: string
  loc: Array<string | number>
  msg: string
  input?: unknown
}

export interface ApiErrorPayload {
  detail: string | ValidationIssue[]
}

export interface Inventory {
  weapons: CatalogId[]
  armors: CatalogId[]
  items: Record<CatalogId, number>
  materials: Record<CatalogId, number>
}

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'
