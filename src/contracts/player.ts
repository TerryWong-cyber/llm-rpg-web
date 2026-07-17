import type { ItemType, Inventory } from './common'
import type { MapInstance } from './exploration'

export interface PlayerProfile {
  player_id: string
  name: string
  character_id: string
  gold: number
  inventory: Inventory
  stamina: number
  max_stamina: number
  world_seed?: number | null
  current_map: MapInstance | null
  world_maps?: Record<string, MapInstance>
  last_camped_game_day?: number | null
}

export interface CreateCharacterRequest {
  name: string
  character_id: string
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
  can_be_ingredient: boolean
}

export interface CraftSuccessResponse {
  status: 'success'
  result: CraftResult
  failure_reason: ''
  profile: PlayerProfile
}

export interface CraftFailureResponse {
  status: 'failed'
  result: null
  failure_reason: string
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
}

export interface RecipesResponse {
  status: 'success'
  recipes: RecipeRecord[]
}
