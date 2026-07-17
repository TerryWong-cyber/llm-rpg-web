import { computed, readonly, ref } from 'vue'
import * as gameApi from '../api/game'
import type {
  CombatSnapshot,
  CraftResponse,
  ItemType,
  MapInstance,
  PlayerProfile,
} from '../contracts'
import { normalizeInventory, normalizeProfile } from '../api/normalizers'
import { useCatalogStore } from './catalog'
import { useNotificationsStore } from './notifications'

const STORAGE_KEY = 'llm-rpg.player-session.v3'

const profile = ref<PlayerProfile | null>(null)
const playerId = ref('')
const busy = ref(false)
const restoredFromCache = ref(false)

function persist(): void {
  if (!playerId.value || !profile.value) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    player_id: playerId.value,
    profile: profile.value,
  }))
}

function restoreSession(): boolean {
  try {
    const cached = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as {
      player_id?: string
      profile?: PlayerProfile
    } | null
    if (!cached?.player_id || !cached.profile || cached.profile.player_id !== cached.player_id) return false
    playerId.value = String(cached.player_id)
    profile.value = normalizeProfile(cached.profile)
    restoredFromCache.value = true
    return true
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return false
  }
}

function replaceProfile(next: PlayerProfile): void {
  profile.value = normalizeProfile(next)
  playerId.value = profile.value.player_id
  persist()
}

function clearSession(): void {
  playerId.value = ''
  profile.value = null
  restoredFromCache.value = false
  localStorage.removeItem(STORAGE_KEY)
  useNotificationsStore().clearSessionIssue()
}

async function create(name: string, characterId: string): Promise<boolean> {
  busy.value = true
  try {
    const response = await gameApi.createCharacter({
      name: name.trim(),
      character_id: String(characterId),
    })
    replaceProfile(response.profile)
    restoredFromCache.value = false
    useNotificationsStore().show(`欢迎踏入远境，${response.profile.name}。`, 'success')
    return true
  } catch (error) {
    useNotificationsStore().capture(error, '角色档案创建失败。')
    return false
  } finally {
    busy.value = false
  }
}

async function tradeItem(
  action: 'buy' | 'sell',
  itemType: ItemType,
  itemId: string,
  threadId?: string | null,
): Promise<CombatSnapshot | null> {
  if (!playerId.value) return null
  busy.value = true
  try {
    const response = await gameApi.trade(action, {
      player_id: playerId.value,
      thread_id: threadId,
      item_type: itemType,
      item_id: String(itemId),
    })
    if ('room_id' in response && 'state' in response) return response
    replaceProfile(response.profile)
    useNotificationsStore().show(action === 'buy' ? '交易完成，物品已收入行囊。' : '交易完成，金币已到账。', 'success')
    return null
  } catch (error) {
    useNotificationsStore().capture(error, '交易未能完成。', true)
    return null
  } finally {
    busy.value = false
  }
}

async function craftItems(
  first: { type: ItemType; id: string },
  second: { type: ItemType; id: string },
): Promise<CraftResponse | null> {
  if (!playerId.value) return null
  busy.value = true
  try {
    const response = await gameApi.craft({
      player_id: playerId.value,
      item1_type: first.type,
      item1_id: String(first.id),
      item2_type: second.type,
      item2_id: String(second.id),
    })
    replaceProfile(response.profile)
    const catalog = useCatalogStore()
    if (response.status === 'success') {
      catalog.rememberCraftResult(response.result)
      await catalog.loadCatalog(true)
      useNotificationsStore().show(`炼成「${response.result.name}」。`, 'success')
    } else {
      useNotificationsStore().show(response.failure_reason, 'warning')
    }
    await catalog.loadRecipes()
    return response
  } catch (error) {
    useNotificationsStore().capture(error, '炼金推演失败，原料没有被消耗。', true)
    return null
  } finally {
    busy.value = false
  }
}

function syncExploration(map: MapInstance, materials: Record<string, number>): void {
  if (!profile.value) return
  replaceProfile({
    ...profile.value,
    current_map: map,
    inventory: { ...profile.value.inventory, materials: { ...materials } },
  })
}

function syncCombat(snapshot: CombatSnapshot): void {
  if (!profile.value) return
  const state = snapshot.state
  const isSecondPlayer = state.p2_id === playerId.value
  const inventory = isSecondPlayer && 'weapons' in state.ai_inventory
    ? normalizeInventory(state.ai_inventory)
    : normalizeInventory(state.player_inventory)
  const gold = isSecondPlayer ? state.ai_gold : state.player_gold
  replaceProfile({ ...profile.value, gold, inventory })
}

export function usePlayerStore() {
  return {
    profile: readonly(profile),
    playerId: computed(() => playerId.value),
    busy: computed(() => busy.value),
    hasSession: computed(() => Boolean(playerId.value && profile.value)),
    restoredFromCache: computed(() => restoredFromCache.value),
    restoreSession,
    replaceProfile,
    clearSession,
    create,
    tradeItem,
    craftItems,
    syncExploration,
    syncCombat,
  }
}
