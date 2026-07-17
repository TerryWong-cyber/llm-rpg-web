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
    inventory: normalizeInventory(profile.inventory),
    current_map: profile.current_map ? normalizeMap(profile.current_map) : null,
  }
}

function normalizeCell(cell: MapCell & { is_gathered?: boolean }): MapCell {
  return {
    ...cell,
    gathered: Boolean(cell.gathered ?? cell.is_gathered),
  }
}

export function normalizeMap(map: MapInstance): MapInstance {
  return { ...map, cells: (map.cells ?? []).map(normalizeCell) }
}

export function normalizeMapState(response: MapStateResponse): MapStateResponse {
  const mapGrid = (response.map_grid ?? response.map.cells ?? []).map(normalizeCell)
  return {
    ...response,
    map: { ...normalizeMap(response.map), cells: mapGrid },
    map_grid: mapGrid,
    inventory_materials: normalizeQuantityMap(response.inventory_materials),
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
      p1_id: String(snapshot.state.p1_id),
      p2_id: snapshot.state.p2_id === null ? null : String(snapshot.state.p2_id),
      player_inventory: normalizeInventory(snapshot.state.player_inventory),
      player_class: normalizeCharacter(snapshot.state.player_class),
      player_weapon: normalizeWeapon(snapshot.state.player_weapon),
      player_armor: normalizeArmor(snapshot.state.player_armor),
      player_item: normalizeItem(snapshot.state.player_item),
      player_item_id: snapshot.state.player_item_id === null ? null : String(snapshot.state.player_item_id),
      ai_inventory: 'weapons' in snapshot.state.ai_inventory
        ? normalizeInventory(snapshot.state.ai_inventory as Inventory)
        : {},
      ai_class: normalizeCharacter(snapshot.state.ai_class),
      ai_weapon: normalizeWeapon(snapshot.state.ai_weapon),
      ai_armor: normalizeArmor(snapshot.state.ai_armor),
      ai_item: normalizeItem(snapshot.state.ai_item),
      ai_item_id: snapshot.state.ai_item_id === null ? null : String(snapshot.state.ai_item_id),
    },
  }
}
