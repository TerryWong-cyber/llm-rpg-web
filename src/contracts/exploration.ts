import type { MapScale } from './common'
import type { ResourceDefinition } from './catalog'

export interface MapTemplate {
  template_id: string
  world_id: string
  region_id: string
  scale: MapScale
  width: number
  height: number
  terrain_weights: Record<string, number>
  landmarks: Record<string, string>
}

export interface MapCell {
  cell_id: number
  x: number
  y: number
  terrain_id: string
  landmark_id: string | null
  passable: boolean
  explored: boolean
  gathered: boolean
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
  current_cell_id: number
  cells: MapCell[]
}

export interface TerrainDefinition {
  id: string
  name: string
  emoji: string
  passable: boolean
  drops: Record<string, number>
}

export interface EncounterResult {
  encounter_id: string
  npc_id: string
  story_hook_id: string | null
  trigger: 'on_enter_map' | 'on_enter_cell' | 'on_gather'
}

export interface MapStateResponse {
  map: MapInstance
  map_grid: Array<MapCell & { is_gathered?: boolean }>
  terrains_meta: Record<string, TerrainDefinition>
  resources_meta: Record<string, ResourceDefinition>
  inventory_materials: Record<string, number>
  encounter: EncounterResult | null
}

export interface MapTemplatesResponse {
  templates: MapTemplate[]
  worlds: Record<string, { world_id: string; name: string }>
  regions: Record<string, { region_id: string; world_id: string; name: string }>
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

export interface GatherResponse {
  status: 'success'
  msg: string
  loot: Record<string, number>
  cell_id: number
  inventory_materials: Record<string, number>
  map: MapInstance
  encounter: EncounterResult | null
}
