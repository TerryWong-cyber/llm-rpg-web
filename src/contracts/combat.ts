import type { ArmorDefinition, CharacterDefinition, ConsumableDefinition, RaceDefinition, SkillDefinition, WeaponDefinition } from './catalog'
import type { GameMode, Inventory } from './common'
import type { NpcRelationship, PublicNpc } from './npc'
import type { MonsterDefinition } from './exploration'
import type { CombatStatus, ProgressionView } from './player'

export interface DerivedCombatStats {
  vitality: number
  strength: number
  agility: number
  wisdom: number
  luck: number
  physical_power: number
  spell_power: number
  accuracy: number
  evasion: number
  critical_chance: number
  critical_multiplier: number
  physical_resistance: number
  magic_resistance: number
  elemental_resistances: Record<string, number>
  physical_penetration: number
  magic_penetration: number
  status_resistance: number
  max_hp: number
  max_mp: number
  max_stamina: number
}

export interface DamageBreakdown {
  hit: boolean
  critical: boolean
  effectiveness: number
  hit_chance: number
  physical: number
  magical: number
  elemental: Record<string, number>
  true: number
  total: number
}

export interface EffectivenessAssessment {
  score: number
  reason: string
  factors: string[]
}

export interface CombatantResolution {
  effectiveness: EffectivenessAssessment
  damage: DamageBreakdown
  status_damage_received: DamageBreakdown
  environment_damage_received: DamageBreakdown
}

export interface RoundResolution {
  turn: number
  player: CombatantResolution
  opponent: CombatantResolution
}

export interface CombatState {
  environment: string | null
  environment_context: { description?: string; tags: string[]; hazards: Array<Record<string, unknown>> }
  turn_count: number
  game_mode: GameMode
  p1_id: string
  p2_id: string | null
  player_gold: number
  player_inventory: Inventory
  player_class: CharacterDefinition | null
  player_race: RaceDefinition | null
  player_race_skills: SkillDefinition[]
  player_progression: ProgressionView
  player_weapon: WeaponDefinition | null
  player_armor: ArmorDefinition | null
  player_item: ConsumableDefinition | null
  player_item_id: string | null
  player_item_count: number
  player_hp: number
  player_max_hp: number
  player_mp: number
  player_max_mp: number
  player_stamina: number
  player_max_stamina: number
  player_status: string
  player_statuses: CombatStatus[]
  player_stats: DerivedCombatStats | null
  ai_gold: number
  ai_inventory: Inventory | Record<string, never>
  ai_class: CharacterDefinition | null
  ai_race: RaceDefinition | null
  ai_race_skills: SkillDefinition[]
  ai_progression: ProgressionView | null
  ai_weapon: WeaponDefinition | null
  ai_armor: ArmorDefinition | null
  ai_item: ConsumableDefinition | null
  ai_item_id: string | null
  ai_item_count: number
  ai_hp: number
  ai_max_hp: number
  ai_mp: number
  ai_max_mp: number
  ai_stamina: number
  ai_max_stamina: number
  ai_status: string
  ai_statuses: CombatStatus[]
  ai_stats: DerivedCombatStats | null
}

export interface CombatSnapshot {
  room_id: string
  thread_id: string
  next_node: 'PlayerPrep' | 'PlayerAction' | null | string
  game_over: boolean
  state: CombatState
  combat_log: string
  last_resolution: RoundResolution | Record<string, never>
  npc_enemy: (PublicNpc & { relationship: NpcRelationship }) | null
  monster_enemy: MonsterDefinition | null
  reward_summary: string | null
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
  item_id?: string
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

export interface CombatStartResponse {
  status: 'success'
  room_id: string
  websocket_path: string
  snapshot: CombatSnapshot
}

export type NpcCombatStartResponse = CombatStartResponse

export interface CombatantView {
  id: string | null
  gold: number
  inventory: Inventory | Record<string, never>
  class: CharacterDefinition | null
  race: RaceDefinition | null
  raceSkills: SkillDefinition[]
  weapon: WeaponDefinition | null
  armor: ArmorDefinition | null
  item: ConsumableDefinition | null
  itemCount: number
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  stamina: number
  maxStamina: number
  status: string
  statuses: CombatStatus[]
  stats: DerivedCombatStats | null
}
