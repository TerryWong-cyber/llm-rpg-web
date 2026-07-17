import type { CatalogId } from './common'

export interface CharacterDefinition {
  id: CatalogId
  name: string
  hp: number
  mp: number
  str: number
  agi: number
  int: number
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
  self_effect?: string
  self_effect_ratio?: number
}

export interface WeaponDefinition {
  id: CatalogId
  name: string
  base_dmg: number
  range: string
  type: 'phys' | 'magic'
  value: number
  desc: string
  image_url?: string
  can_be_ingredient: boolean
  skills: SkillDefinition[]
}

export interface ArmorDefinition {
  id: CatalogId
  name: string
  hp_bonus: number
  def_rate: number
  value: number
  desc: string
  image_url?: string
  can_be_ingredient: boolean
}

export interface ConsumableDefinition {
  id: CatalogId
  name: string
  type: 'heal_hp' | 'heal_mp' | 'heal_both' | 'dmg'
  val: number
  value: number
  desc: string
  image_url?: string
  can_be_ingredient: boolean
}

export interface ResourceDefinition {
  id: CatalogId
  name: string
  emoji: string
  value: number
  desc?: string
  image_url?: string
  can_be_ingredient: boolean
}

export interface GameMeta {
  characters: Record<CatalogId, CharacterDefinition>
  weapons: Record<CatalogId, WeaponDefinition>
  armors: Record<CatalogId, ArmorDefinition>
  items: Record<CatalogId, ConsumableDefinition>
  resources: Record<CatalogId, ResourceDefinition>
}
