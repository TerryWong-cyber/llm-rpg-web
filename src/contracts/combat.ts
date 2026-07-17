import type { ArmorDefinition, CharacterDefinition, ConsumableDefinition, WeaponDefinition } from './catalog'
import type { GameMode, Inventory } from './common'
import type { NpcRelationship, PublicNpc } from './npc'

export interface CombatState {
  environment: string | null
  turn_count: number
  game_mode: GameMode
  p1_id: string
  p2_id: string | null
  player_gold: number
  player_inventory: Inventory
  player_class: CharacterDefinition | null
  player_weapon: WeaponDefinition | null
  player_armor: ArmorDefinition | null
  player_item: ConsumableDefinition | null
  player_item_id: string | null
  player_item_count: number
  player_hp: number
  player_mp: number
  player_status: string
  ai_gold: number
  ai_inventory: Inventory | Record<string, never>
  ai_class: CharacterDefinition | null
  ai_weapon: WeaponDefinition | null
  ai_armor: ArmorDefinition | null
  ai_item: ConsumableDefinition | null
  ai_item_id: string | null
  ai_item_count: number
  ai_hp: number
  ai_mp: number
  ai_status: string
}

export interface CombatSnapshot {
  room_id: string
  thread_id: string
  next_node: 'PlayerPrep' | 'PlayerAction' | null | string
  game_over: boolean
  state: CombatState
  combat_log: string
  npc_enemy: (PublicNpc & { relationship: NpcRelationship }) | null
}

export interface PrepMessage {
  action: 'prep'
  weapon_id: string
  armor_id: string
  item_id?: string | null
}

export interface CombatActionMessage {
  action: 'combat'
  action_key: '0' | '9' | 'i' | string
}

export type CombatClientMessage = PrepMessage | CombatActionMessage

export type CombatServerEvent =
  | { event: 'game_start'; snapshot: CombatSnapshot }
  | { event: 'player_ready'; player_id: string; phase: 'prep' | 'combat' }
  | { event: 'snapshot'; snapshot: CombatSnapshot }
  | { event: 'error'; msg: string }

export interface CreateRoomResponse { room_id: string }
export interface JoinRoomResponse { room_id: string; mode: 'PvP' }
export interface AddAiResponse { room_id: string; mode: 'PvE' }

export interface NpcCombatStartResponse {
  status: 'success'
  room_id: string
  websocket_path: string
  snapshot: CombatSnapshot
}

export interface CombatantView {
  id: string | null
  gold: number
  inventory: Inventory | Record<string, never>
  class: CharacterDefinition | null
  weapon: WeaponDefinition | null
  armor: ArmorDefinition | null
  item: ConsumableDefinition | null
  itemCount: number
  hp: number
  mp: number
  status: string
}
