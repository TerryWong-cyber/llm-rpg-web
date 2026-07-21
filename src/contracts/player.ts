import type { ItemType, Inventory } from './common'
import type { MapInstance } from './exploration'

export interface PlayerProfile {
  player_id: string
  name: string
  character_id: string
  race_id: string
  created_at: string
  level: number
  experience: number
  experience_to_next: number
  total_experience: number
  attribute_points: number
  attributes: CharacterAttributes
  active_quests: Record<string, QuestProgress>
  completed_quests: string[]
  quest_history?: Record<string, QuestProgress>
  gold: number
  inventory: Inventory
  current_hp: number
  max_hp: number
  current_mp: number
  max_mp: number
  stamina: number
  max_stamina: number
  combat_statuses: CombatStatus[]
  psychological_traits: string[]
  equipped_weapon_id?: string | null
  equipped_armor_id?: string | null
  equipped_item_id?: string | null
  world_seed?: number | null
  current_map: MapInstance | null
  world_maps?: Record<string, MapInstance>
  last_camped_game_day?: number | null
  last_stamina_recovery_game_hour?: number | null
  sleep?: SleepState | null
  encountered_npc_ids?: string[]
  learned_skills: Record<string, LearnedSkill>
  equipped_skill_ids: string[]
  exploration_effects: ExplorationSkillEffect[]
  chronicle: CharacterChronicleEntry[]
}

export type ChronicleCategory = 'origin' | 'growth' | 'skill' | 'quest' | 'exploration' | 'combat'

export interface CharacterChronicleEntry {
  entry_id: string
  category: ChronicleCategory
  title: string
  description: string
  emoji: string
  source_id?: string | null
  game_hour?: number | null
  year?: number | null
  month?: number | null
  day?: number | null
  hour?: number | null
  occurred_at: string
  details: Record<string, unknown>
}

export interface LearnedSkill {
  skill_id: string
  source: 'starter' | 'skill_book' | 'npc' | 'race_level' | 'quest' | 'admin'
  source_id?: string | null
  learned_at: string
}

export interface ExplorationSkillEffect {
  state_id: string
  name: string
  source_skill_id: string
  started_at: string
  expires_at: string
  capabilities: string[]
}

export interface SleepState {
  started_at: string
  started_game_hour: number
  duration_seconds: number
  duration_game_hours: number
  start_hp: number
  start_mp: number
  start_stamina: number
  location_kind: 'camp' | 'inn'
}

export interface CharacterAttributes {
  vitality: number
  strength: number
  agility: number
  wisdom: number
  luck: number
}

export interface QuestRequirement {
  kind: 'inventory' | 'region'
  description: string
  item_type?: 'item' | 'material' | null
  item_id?: string | null
  quantity?: number
  consume?: boolean
  region_id?: string | null
  current?: number | string | null
  completed?: boolean
}

export interface QuestProgress {
  hook_id: string
  npc_id: string
  title: string
  summary: string
  xp_reward: number
  skill_rewards?: string[]
  requirements: QuestRequirement[]
  related_npc_ids?: string[]
  related_npcs?: import('./npc').PublicNpc[]
  status?: 'active' | 'completed'
  started_game_hour?: number | null
  completed_game_hour?: number | null
}

export interface ProgressionView {
  race_id: string
  level: number
  experience: number
  total_experience: number
  experience_to_next: number
  attribute_points: number
  attributes: CharacterAttributes
}

export interface CombatStatus {
  status_id: string
  name: string
  source_id: string
  stacks: number
  potency: number
  remaining_turns: number
  persistent: boolean
  tags: string[]
}

export interface CreateCharacterRequest {
  name: string
  race_id: string
}

export interface ProfileUpdateResponse {
  status: 'success'
  profile: PlayerProfile
  progression?: ProgressionView
  reward?: { experience: number; levels_gained: number; level: number; attribute_points: number; unlocked_skills?: string[] }
}

export interface ItemUseOutcome {
  item_id: string
  context: 'combat' | 'exploration' | 'world_event'
  consumed: number
  hp_restored: number
  mp_restored: number
  stamina_restored: number
  cleared_statuses: number
  applied_statuses: string[]
}

export interface UseItemResponse {
  status: 'success'
  profile: PlayerProfile
  outcome: ItemUseOutcome
}

export interface CreateCharacterResponse {
  status: 'success'
  player_id: string
  profile: PlayerProfile
}

export interface TradeRequest {
  player_id: string
  thread_id?: string | null
  item_type: ItemType
  item_id: string
}

export interface EquipmentRequest {
  player_id: string
  item_type: 'weapon' | 'armor'
  item_id: string | null
}

export interface TradeResponse {
  status: 'success'
  profile: PlayerProfile
}

export interface CraftRequest {
  player_id: string
  item1_type: ItemType
  item1_id: string
  item2_type: ItemType
  item2_id: string
}

export interface CraftResult {
  id: string
  name: string
  desc: string
  value: number
  item_type: ItemType
  type: ItemType
  combat_stat: number
  image_url: string
  image_key: string
  image_status: 'generated' | 'fallback' | null
  can_be_ingredient: boolean
  tradable: boolean
  use_contexts: Array<'combat' | 'exploration' | 'world_event'>
  category: string
  tags: string[]
  properties: Record<string, string | number | boolean>
}

export interface CraftSuccessResponse {
  status: 'success'
  result: CraftResult
  failure_reason: ''
  duration_ms: number
  recipe_cached: boolean
  profile: PlayerProfile
}

export interface CraftFailureResponse {
  status: 'failed'
  result: null
  failure_reason: string
  duration_ms: number
  recipe_cached: boolean
  profile: PlayerProfile
}

export type CraftResponse = CraftSuccessResponse | CraftFailureResponse

export interface RecipeIngredient {
  item_type: ItemType
  item_id: string
}

export interface RecipeRecord {
  ingredients: [RecipeIngredient, RecipeIngredient]
  mat1_id: string
  mat2_id: string
  success: boolean
  result: CraftResult | null
  failure_reason: string
  duration_ms: number
}

export interface RecipesResponse {
  status: 'success'
  recipes: RecipeRecord[]
}
