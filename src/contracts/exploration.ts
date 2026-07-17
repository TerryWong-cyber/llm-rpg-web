import type { MapScale } from './common'
import type { ResourceDefinition } from './catalog'
import type { CombatStartResponse } from './combat'
import type { PublicNpc, StoryHook } from './npc'

export type MoveDirection = 'up' | 'down' | 'left' | 'right'
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export type DayPeriod = 'dawn' | 'day' | 'dusk' | 'night'

export interface MapTemplate {
  template_id: string
  world_id: string
  region_id: string
  scale: MapScale
  width: number
  height: number
  terrain_weights: Record<string, number>
  terrain_counts: Record<string, number>
  primary_terrain_id: string | null
  landmarks: Record<string, string>
  landmark_terrains: Record<string, string>
}

export interface MapCell {
  cell_id: number
  x: number
  y: number
  terrain_id: string
  landmark_id: string | null
  passable: boolean
  terrain_category: 'ordinary' | 'resource' | 'settlement' | 'interactive' | 'blocked'
  tags: string[]
  gatherable: boolean
  campable: boolean
  movement_cost: number
  npc_chance_multiplier: number
  interaction_ids: string[]
  explored: boolean
  gathered: boolean
  triggered_event_ids: string[]
  active_event_ids: string[]
}

export interface MapInstance {
  map_id: string
  template_id: string
  world_id: string
  region_id: string
  scale: MapScale
  width: number
  height: number
  seed: number
  config_version: string
  world_x: number
  world_y: number
  world_width: number
  world_height: number
  current_cell_id: number
  cells: MapCell[]
}

export interface GatherRule {
  resource_id: string
  chance: number
  minimum?: number
  maximum?: number
  conditions?: {
    periods?: DayPeriod[]
    seasons?: Season[]
    regions?: string[]
  }
}

export interface TerrainDefinition {
  id: string
  name: string
  emoji: string
  image_url?: string
  category: MapCell['terrain_category']
  tags: string[]
  passable: boolean
  gatherable: boolean
  campable: boolean
  movement_cost: number
  npc_chance_multiplier: number
  interactions?: string[]
  shop_conditions?: { periods?: DayPeriod[] }
  gather_rules: GatherRule[]
}

export interface EncounterResult {
  encounter_id: string
  npc_id: string
  story_hook_id: string | null
  trigger: 'on_enter_map' | 'on_enter_cell' | 'on_gather'
}

export interface WorldEventResult {
  event_id: string
  kind: 'flavor' | 'discovery' | 'danger' | 'combat_hint' | 'settlement'
  title: string
  description: string
  emoji: string
  trigger: string
  state: 'triggered' | 'active' | 'expired' | 'action'
  actions: WorldEventAction[]
  trigger_scope: 'cell' | 'region' | 'world'
  trigger_count: number
  max_triggers: number | null
  cell_id: number | null
  participant: WorldEventParticipant | null
  blocks_movement: boolean
}

export interface WorldEventAction {
  action_id: string
  label: string
  style: 'primary' | 'quiet' | 'danger'
  kind: 'narrative' | 'open_npc' | 'start_quest' | 'npc_combat' | 'monster_combat'
  forced: boolean
}

export interface MonsterDefinition {
  monster_id: string
  name: string
  title: string
  description: string
  emoji: string
  image_url: string | null
  habitats: string[]
  tags: string[]
  stats: { hp: number; mp: number; strength: number; agility: number; intelligence: number }
  equipment: { weapon_id: string; weapon_name: string; armor_id: string; armor_name: string; item_id: string | null; item_count: number }
  combat: { threat: number; tactics: string[]; arena: string; forced: boolean }
  gold_min: number
  gold_max: number
  drops: Array<{ item_type: 'item' | 'material'; item_id: string; chance: number; minimum: number; maximum: number }>
}

export type WorldEventParticipant = ({ type: 'npc' } & PublicNpc) | ({ type: 'monster' } & MonsterDefinition)

export interface EventActionResponse extends MapStateResponse {
  interaction: {
    type: WorldEventAction['kind']
    npc_id?: string
    monster_id?: string
    story_hook?: StoryHook
  }
  combat: CombatStartResponse | null
}

export interface WorldEventLogEntry {
  log_id: string
  event_id: string
  phase: 'triggered' | 'action' | 'expired'
  title: string
  description: string
  emoji: string
  kind: WorldEventResult['kind']
  world_id: string
  region_id: string
  map_id: string
  cell_id: number
  game_hour: number
  year: number
  month: number
  day: number
  hour: number
  season: Season
}

export interface WorldTimeSnapshot {
  total_game_hours: number
  year: number
  month: number
  day: number
  hour: number
  season: Season
  period: DayPeriod
  is_day: boolean
  observed_at: string
  real_seconds_per_game_hour: number
}

export interface RegionDefinition {
  region_id: string
  world_id: string
  name: string
  world_x: number
  world_y: number
  climate: string
  culture: string
}

export interface WorldOverview {
  width: number
  height: number
  regions: Record<string, RegionDefinition>
}

export interface ActionAvailability {
  available: boolean
  reason: string
  cost: number
}

export interface MapTransition {
  from_region_id: string
  to_region_id: string
  direction: MoveDirection
}

export interface ExplorationPlayerState {
  stamina: number
  max_stamina: number
  inventory_items: Record<string, number>
  last_camped_game_day: number | null
}

export interface MapStateResponse {
  map: MapInstance
  map_grid: Array<MapCell & { is_gathered?: boolean }>
  terrains_meta: Record<string, TerrainDefinition>
  resources_meta: Record<string, ResourceDefinition>
  inventory_materials: Record<string, number>
  player: ExplorationPlayerState
  world: WorldOverview
  world_time: WorldTimeSnapshot
  actions: Record<'gather' | 'camp' | 'shop' | 'eat', ActionAvailability>
  encounter: EncounterResult | null
  event: WorldEventResult | null
  event_log: WorldEventLogEntry[]
  transition: MapTransition | null
}

export interface MapTemplatesResponse {
  templates: MapTemplate[]
  worlds: Record<string, { world_id: string; name: string }>
  regions: Record<string, RegionDefinition>
  world_grid: WorldOverview
  world_time: WorldTimeSnapshot
}

export interface EnterMapRequest {
  player_id: string
  template_id?: string | null
  refresh?: boolean
  seed?: number | null
}

export interface CellRequest {
  player_id: string
  cell_id: number
}

export interface DirectionRequest {
  player_id: string
  direction: MoveDirection
}

export interface EatRequest {
  player_id: string
  item_id: string
}

export interface EventActionRequest {
  player_id: string
  event_id: string
  action_id: string
}

export interface GatherResponse extends MapStateResponse {
  status: 'success'
  msg: string
  loot: Record<string, number>
  cell_id: number
}

export interface RestResponse extends MapStateResponse {
  status: 'success'
}
