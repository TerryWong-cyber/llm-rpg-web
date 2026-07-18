import type {
  ArmorDefinition,
  CharacterDefinition,
  CombatSnapshot,
  ConsumableDefinition,
  GameMeta,
  Inventory,
  MapCell,
  MapInstance,
  MapStateResponse,
  PlayerProfile,
  ResourceDefinition,
  RaceDefinition,
  SkillDefinition,
  WeaponDefinition,
} from '../contracts'

type RawRecord = Record<string, Record<string, unknown>>

function normalizeRecord<T>(
  record: RawRecord | undefined,
  normalize: (value: Record<string, unknown>, id: string) => T,
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(record ?? {}).map(([key, value]) => {
      const id = String(value.id ?? key)
      return [String(key), normalize(value, id)]
    }),
  )
}

export function normalizeInventory(value: Inventory | null | undefined): Inventory {
  return {
    weapons: (value?.weapons ?? []).map(String),
    armors: (value?.armors ?? []).map(String),
    items: normalizeQuantityMap(value?.items),
    materials: normalizeQuantityMap(value?.materials),
  }
}

function normalizeQuantityMap(value: Record<string, number> | undefined): Record<string, number> {
  return Object.fromEntries(
    Object.entries(value ?? {}).map(([id, quantity]) => [String(id), Number(quantity) || 0]),
  )
}

function normalizeSkills(value: unknown): SkillDefinition[] {
  if (!Array.isArray(value)) return []
  return value.map((skill) => ({ ...skill, id: String(skill.id) })) as SkillDefinition[]
}

function normalizeCraftingFlag(value: Record<string, unknown>): boolean {
  return value.can_be_ingredient !== false
}

export function normalizeGameMeta(raw: unknown): GameMeta {
  const meta = raw as Partial<Record<keyof GameMeta, RawRecord>>
  return {
    characters: normalizeRecord(meta.characters, (value, id) => ({ ...value, id }) as CharacterDefinition),
    races: normalizeRecord(meta.races, (value, id) => ({
      ...value,
      id,
      exclusive_skills: normalizeSkills(value.exclusive_skills),
    }) as RaceDefinition),
    weapons: normalizeRecord(meta.weapons, (value, id) => ({
      ...value,
      id,
      can_be_ingredient: normalizeCraftingFlag(value),
      skills: normalizeSkills(value.skills),
    }) as WeaponDefinition),
    armors: normalizeRecord(meta.armors, (value, id) => ({
      ...value,
      id,
      can_be_ingredient: normalizeCraftingFlag(value),
    }) as ArmorDefinition),
    items: normalizeRecord(meta.items, (value, id) => ({
      ...value,
      id,
      can_be_ingredient: normalizeCraftingFlag(value),
    }) as ConsumableDefinition),
    resources: normalizeRecord(meta.resources, (value, id) => ({
      ...value,
      id,
      can_be_ingredient: normalizeCraftingFlag(value),
    }) as ResourceDefinition),
  }
}

export function normalizeProfile(profile: PlayerProfile): PlayerProfile {
  return {
    ...profile,
    player_id: String(profile.player_id),
    character_id: String(profile.character_id),
    race_id: String(profile.race_id ?? '1'),
    level: Number(profile.level ?? 1),
    experience: Number(profile.experience ?? 0),
    experience_to_next: Number(profile.experience_to_next ?? 100),
    total_experience: Number(profile.total_experience ?? profile.experience ?? 0),
    attribute_points: Number(profile.attribute_points ?? 0),
    attributes: profile.attributes ?? {
      vitality: 5,
      strength: 5,
      agility: 5,
      wisdom: 5,
      luck: 5,
    },
    active_quests: profile.active_quests ?? {},
    completed_quests: profile.completed_quests ?? [],
    inventory: normalizeInventory(profile.inventory),
    current_hp: Number(profile.current_hp ?? 1),
    max_hp: Number(profile.max_hp ?? profile.current_hp ?? 1),
    current_mp: Number(profile.current_mp ?? 0),
    max_mp: Number(profile.max_mp ?? profile.current_mp ?? 0),
    stamina: Number(profile.stamina ?? 100),
    max_stamina: Number(profile.max_stamina ?? 100),
    combat_statuses: profile.combat_statuses ?? [],
    psychological_traits: profile.psychological_traits ?? [],
    equipped_weapon_id: profile.equipped_weapon_id == null ? null : String(profile.equipped_weapon_id),
    equipped_armor_id: profile.equipped_armor_id == null ? null : String(profile.equipped_armor_id),
    equipped_item_id: profile.equipped_item_id == null ? null : String(profile.equipped_item_id),
    current_map: profile.current_map ? normalizeMap(profile.current_map) : null,
    world_maps: Object.fromEntries(
      Object.entries(profile.world_maps ?? {}).map(([key, map]) => [key, normalizeMap(map)]),
    ),
  }
}

function normalizeCell(cell: MapCell & { is_gathered?: boolean }): MapCell {
  return {
    ...cell,
    terrain_category: cell.terrain_category ?? 'ordinary',
    tags: cell.tags ?? [],
    gatherable: Boolean(cell.gatherable),
    campable: Boolean(cell.campable),
    movement_cost: Number(cell.movement_cost ?? 1),
    npc_chance_multiplier: Number(cell.npc_chance_multiplier ?? 1),
    interaction_ids: cell.interaction_ids ?? [],
    gathered: Boolean(cell.gathered ?? cell.is_gathered),
    triggered_event_ids: cell.triggered_event_ids ?? [],
    active_event_ids: cell.active_event_ids ?? [],
  }
}

export function normalizeMap(map: MapInstance): MapInstance {
  return {
    ...map,
    world_x: Number(map.world_x ?? 0),
    world_y: Number(map.world_y ?? 0),
    world_width: Number(map.world_width ?? 1),
    world_height: Number(map.world_height ?? 1),
    cells: (map.cells ?? []).map(normalizeCell),
  }
}

export function normalizeMapState(response: MapStateResponse): MapStateResponse {
  const mapGrid = (response.map_grid ?? response.map.cells ?? []).map(normalizeCell)
  return {
    ...response,
    map: { ...normalizeMap(response.map), cells: mapGrid },
    map_grid: mapGrid,
    inventory_materials: normalizeQuantityMap(response.inventory_materials),
    event_log: response.event_log ?? [],
  }
}

export function normalizeCombatSnapshot(snapshot: CombatSnapshot): CombatSnapshot {
  const normalizeCharacter = (value: CharacterDefinition | null): CharacterDefinition | null => (
    value ? { ...value, id: String(value.id) } : null
  )
  const normalizeWeapon = (value: WeaponDefinition | null): WeaponDefinition | null => (
    value ? { ...value, id: String(value.id), skills: normalizeSkills(value.skills) } : null
  )
  const normalizeArmor = (value: ArmorDefinition | null): ArmorDefinition | null => (
    value ? { ...value, id: String(value.id) } : null
  )
  const normalizeItem = (value: ConsumableDefinition | null): ConsumableDefinition | null => (
    value ? { ...value, id: String(value.id) } : null
  )
  return {
    ...snapshot,
    room_id: String(snapshot.room_id),
    thread_id: String(snapshot.thread_id),
    state: {
      ...snapshot.state,
      environment_context: {
        ...snapshot.state.environment_context,
        tags: snapshot.state.environment_context?.tags ?? [],
        hazards: snapshot.state.environment_context?.hazards ?? [],
      },
      p1_id: String(snapshot.state.p1_id),
      p2_id: snapshot.state.p2_id === null ? null : String(snapshot.state.p2_id),
      player_inventory: normalizeInventory(snapshot.state.player_inventory),
      player_class: normalizeCharacter(snapshot.state.player_class),
      player_race: snapshot.state.player_race
        ? { ...snapshot.state.player_race, id: String(snapshot.state.player_race.id), exclusive_skills: normalizeSkills(snapshot.state.player_race.exclusive_skills) }
        : null,
      player_race_skills: normalizeSkills(snapshot.state.player_race_skills),
      player_weapon: normalizeWeapon(snapshot.state.player_weapon),
      player_armor: normalizeArmor(snapshot.state.player_armor),
      player_item: normalizeItem(snapshot.state.player_item),
      player_item_id: snapshot.state.player_item_id === null ? null : String(snapshot.state.player_item_id),
      player_statuses: snapshot.state.player_statuses ?? [],
      player_stats: snapshot.state.player_stats && 'max_hp' in snapshot.state.player_stats
        ? snapshot.state.player_stats
        : null,
      ai_inventory: 'weapons' in snapshot.state.ai_inventory
        ? normalizeInventory(snapshot.state.ai_inventory as Inventory)
        : {},
      ai_class: normalizeCharacter(snapshot.state.ai_class),
      ai_race: snapshot.state.ai_race
        ? { ...snapshot.state.ai_race, id: String(snapshot.state.ai_race.id), exclusive_skills: normalizeSkills(snapshot.state.ai_race.exclusive_skills) }
        : null,
      ai_race_skills: normalizeSkills(snapshot.state.ai_race_skills),
      ai_weapon: normalizeWeapon(snapshot.state.ai_weapon),
      ai_armor: normalizeArmor(snapshot.state.ai_armor),
      ai_item: normalizeItem(snapshot.state.ai_item),
      ai_item_id: snapshot.state.ai_item_id === null ? null : String(snapshot.state.ai_item_id),
      ai_statuses: snapshot.state.ai_statuses ?? [],
      ai_stats: snapshot.state.ai_stats && 'max_hp' in snapshot.state.ai_stats
        ? snapshot.state.ai_stats
        : null,
    },
    last_resolution: snapshot.last_resolution ?? {},
  }
}
