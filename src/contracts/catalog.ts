import type { CatalogId } from './common'
import type { CharacterAttributes } from './player'

export type ItemUseContext = 'combat' | 'exploration' | 'world_event'

export interface ItemPolicyFields {
  use_contexts: ItemUseContext[]
  tradable: boolean
  can_be_ingredient: boolean
  category: string
  tags: string[]
}

export interface CharacterDefinition {
  id: CatalogId
  name: string
  hp: number
  mp: number
  str: number
  agi: number
  int: number
  wis?: number
  luck?: number
  traits?: string[]
  desc: string
  image_url?: string
}

export interface SkillDefinition {
  id: CatalogId
  name: string
  cost: number
  multiplier: number
  desc: string
  status_effect?: string
  status_chance?: number
  mp_cost?: number
  stamina_cost?: number
  self_effect?: string
  self_effect_ratio?: number
  resource?: 'stamina' | 'mp'
}

export interface RaceDefinition {
  id: CatalogId
  name: string
  ancestry: string
  nation: string
  background: string
  base_attributes: CharacterAttributes
  strengths: string[]
  weaknesses: string[]
  traits: string[]
  exclusive_skills: SkillDefinition[]
  birthplace: {
    world_id: string
    region_id: string
    template_id: string
    cell_id: number
    settlement_name: string
  }
  bonuses: Record<string, unknown>
  conditional_modifiers: Array<Record<string, unknown>>
  passives: Record<string, number>
  image_url?: string
}

export interface WeaponDefinition extends ItemPolicyFields {
  id: CatalogId
  name: string
  base_dmg: number
  physical_damage?: number
  magic_damage?: number
  true_damage?: number
  elemental_damage?: Record<string, number>
  physical_penetration?: number
  magic_penetration?: number
  accuracy_bonus?: number
  range: string
  type: 'phys' | 'magic'
  value: number
  desc: string
  image_url?: string
  skills: SkillDefinition[]
}

export interface ArmorDefinition extends ItemPolicyFields {
  id: CatalogId
  name: string
  hp_bonus: number
  def_rate: number
  physical_resistance?: number
  magic_resistance?: number
  elemental_resistances?: Record<string, number>
  evasion_bonus?: number
  status_resistance?: number
  value: number
  desc: string
  image_url?: string
}

export interface ConsumableDefinition extends ItemPolicyFields {
  id: CatalogId
  name: string
  type: 'heal_hp' | 'heal_mp' | 'heal_both' | 'dmg'
  val: number
  stamina_restore?: number
  damage_type?: 'physical' | 'magical' | 'true'
  status_effect?: string
  status_chance?: number
  clear_negative_statuses?: boolean
  exploration_statuses?: Array<{
    status_id: string
    name: string
    stacks: number
    potency: number
    remaining_turns: number
    tags: string[]
  }>
  value: number
  desc: string
  image_url?: string
}

export interface ResourceDefinition extends ItemPolicyFields {
  id: CatalogId
  name: string
  emoji: string
  category?: 'wood' | 'plant' | 'mineral' | 'creature' | 'aquatic' | 'arcane' | 'regional' | 'relic'
  rarity?: 'common' | 'uncommon' | 'rare'
  value: number
  desc?: string
  image_url?: string
}

export interface GameMeta {
  characters: Record<CatalogId, CharacterDefinition>
  races: Record<CatalogId, RaceDefinition>
  weapons: Record<CatalogId, WeaponDefinition>
  armors: Record<CatalogId, ArmorDefinition>
  items: Record<CatalogId, ConsumableDefinition>
  resources: Record<CatalogId, ResourceDefinition>
}
