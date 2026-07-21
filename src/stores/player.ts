import { computed, readonly, ref } from 'vue'
import * as gameApi from '../api/game'
import type {
  CombatSnapshot,
  CraftResponse,
  ExplorationPlayerState,
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

async function create(name: string, raceId: string): Promise<boolean> {
  busy.value = true
  try {
    const response = await gameApi.createCharacter({
      name: name.trim(),
      race_id: String(raceId),
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

async function allocateAttributes(allocations: Record<string, number>): Promise<boolean> {
  if (!playerId.value) return false
  busy.value = true
  try {
    const response = await gameApi.allocateAttributes(playerId.value, allocations)
    replaceProfile(response.profile)
    useNotificationsStore().show('属性点已经写入旅人档案。', 'success')
    return true
  } catch (error) {
    useNotificationsStore().capture(error, '属性加点未能完成。')
    return false
  } finally {
    busy.value = false
  }
}

async function setEquipment(itemType: 'weapon' | 'armor', itemId: string | null): Promise<boolean> {
  if (!playerId.value) return false
  busy.value = true
  try {
    const response = await gameApi.setEquipment({
      player_id: playerId.value,
      item_type: itemType,
      item_id: itemId,
    })
    replaceProfile(response.profile)
    useNotificationsStore().show(itemId ? '装备已经更新。' : '装备已经卸下。', 'success')
    return true
  } catch (error) {
    useNotificationsStore().capture(error, '无法更新当前装备。', true)
    return false
  } finally {
    busy.value = false
  }
}

async function completeQuest(npcId: string, hookId: string): Promise<boolean> {
  if (!playerId.value) return false
  busy.value = true
  try {
    const response = await gameApi.completeQuest(playerId.value, npcId, hookId)
    replaceProfile(response.profile)
    const reward = response.reward
    const levelText = reward?.levels_gained ? `，提升至 ${reward.level} 级` : ''
    const skillText = reward?.unlocked_skills?.length
      ? `，习得 ${reward.unlocked_skills.map((id) => useCatalogStore().meta.value?.skills[id]?.name ?? id).join('、')}`
      : ''
    useNotificationsStore().show(`任务完成，获得 ${reward?.experience ?? 0} 经验${levelText}${skillText}。`, 'success')
    return true
  } catch (error) {
    useNotificationsStore().capture(error, '任务目标尚未全部满足。')
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
      try {
        const latest = await gameApi.getProfile(playerId.value)
        replaceProfile(latest.profile)
      } catch {
        useNotificationsStore().show('炼金已完成，但行囊状态暂未能再次校验。', 'warning')
      }
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

async function useItem(itemId: string): Promise<boolean> {
  if (!playerId.value) return false
  busy.value = true
  try {
    const response = await gameApi.useItem(playerId.value, itemId)
    replaceProfile(response.profile)
    const restored = [
      response.outcome.hp_restored ? `生命 +${response.outcome.hp_restored}` : '',
      response.outcome.mp_restored ? `魔力 +${response.outcome.mp_restored}` : '',
      response.outcome.stamina_restored ? `精力 +${response.outcome.stamina_restored}` : '',
      response.outcome.cleared_statuses ? `净化 ${response.outcome.cleared_statuses} 个状态` : '',
      response.outcome.applied_statuses.length ? `获得 ${response.outcome.applied_statuses.join('、')}` : '',
    ].filter(Boolean).join('，')
    useNotificationsStore().show(`物品已使用：${restored}。`, 'success')
    return true
  } catch (error) {
    useNotificationsStore().capture(error, '当前无法使用这件物品。', true)
    return false
  } finally {
    busy.value = false
  }
}

async function learnSkillBook(itemId: string): Promise<boolean> {
  if (!playerId.value) return false
  busy.value = true
  try {
    const response = await gameApi.learnSkillBook(playerId.value, itemId)
    replaceProfile(response.profile)
    const skill = useCatalogStore().meta.value?.skills[response.skill_id]
    useNotificationsStore().show(`已习得「${skill?.name ?? response.skill_id}」。`, 'success')
    return true
  } catch (error) {
    useNotificationsStore().capture(error, '技能书研读失败。', true)
    return false
  } finally { busy.value = false }
}

async function equipSkills(skillIds: string[], notify = true): Promise<boolean> {
  if (!playerId.value) return false
  busy.value = true
  try {
    const response = await gameApi.equipSkills(playerId.value, skillIds)
    replaceProfile(response.profile)
    if (notify) useNotificationsStore().show('战斗技能配置已保存。', 'success')
    return true
  } catch (error) {
    useNotificationsStore().capture(error, '无法保存技能配置。', true)
    return false
  } finally { busy.value = false }
}

async function refreshProfile(): Promise<boolean> {
  if (!playerId.value || busy.value) return false
  busy.value = true
  try {
    const response = await gameApi.getProfile(playerId.value)
    replaceProfile(response.profile)
    return true
  } catch (error) {
    useNotificationsStore().capture(error, '角色档案刷新失败。')
    return false
  } finally { busy.value = false }
}

async function castExplorationSkill(skillId: string): Promise<boolean> {
  if (!playerId.value) return false
  busy.value = true
  try {
    const response = await gameApi.castExplorationSkill(playerId.value, skillId)
    replaceProfile(response.profile)
    const skill = useCatalogStore().meta.value?.skills[skillId]
    useNotificationsStore().show(`已释放「${skill?.name ?? skillId}」。`, 'success')
    return true
  } catch (error) {
    useNotificationsStore().capture(error, '当前无法释放该技能。', true)
    return false
  } finally { busy.value = false }
}

async function learnTrainerSkill(npcId: string, skillId: string): Promise<boolean> {
  if (!playerId.value) return false
  busy.value = true
  try {
    const response = await gameApi.learnTrainerSkill(playerId.value, npcId, skillId)
    replaceProfile(response.profile)
    const skill = useCatalogStore().meta.value?.skills[skillId]
    useNotificationsStore().show(`导师传授了「${skill?.name ?? skillId}」。`, 'success')
    return true
  } catch (error) {
    useNotificationsStore().capture(error, '暂时无法向导师学习。', true)
    return false
  } finally { busy.value = false }
}

function syncExploration(
  map: MapInstance,
  materials: Record<string, number>,
  explorationPlayer?: ExplorationPlayerState,
): void {
  if (!profile.value) return
  replaceProfile({
    ...profile.value,
    current_map: map,
    current_hp: explorationPlayer?.current_hp ?? profile.value.current_hp,
    max_hp: explorationPlayer?.max_hp ?? profile.value.max_hp,
    current_mp: explorationPlayer?.current_mp ?? profile.value.current_mp,
    max_mp: explorationPlayer?.max_mp ?? profile.value.max_mp,
    stamina: explorationPlayer?.stamina ?? profile.value.stamina,
    max_stamina: explorationPlayer?.max_stamina ?? profile.value.max_stamina,
    combat_statuses: explorationPlayer?.combat_statuses ?? profile.value.combat_statuses,
    exploration_effects: explorationPlayer?.exploration_effects ?? profile.value.exploration_effects,
    last_camped_game_day: explorationPlayer?.last_camped_game_day ?? profile.value.last_camped_game_day,
    sleep: explorationPlayer?.sleep ?? profile.value.sleep,
    ...(explorationPlayer?.progression ?? {}),
    active_quests: explorationPlayer?.active_quests ?? profile.value.active_quests,
    completed_quests: explorationPlayer?.completed_quests ?? profile.value.completed_quests,
    inventory: {
      ...profile.value.inventory,
      materials: { ...materials },
      items: explorationPlayer?.inventory_items
        ? { ...explorationPlayer.inventory_items }
        : profile.value.inventory.items,
    },
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
  const progression = isSecondPlayer ? state.ai_progression : state.player_progression
  replaceProfile({
    ...profile.value,
    gold,
    ...(progression ?? {}),
    inventory,
    current_hp: isSecondPlayer ? state.ai_hp : state.player_hp,
    max_hp: isSecondPlayer ? state.ai_max_hp : state.player_max_hp,
    current_mp: isSecondPlayer ? state.ai_mp : state.player_mp,
    max_mp: isSecondPlayer ? state.ai_max_mp : state.player_max_mp,
    stamina: isSecondPlayer ? state.ai_stamina : state.player_stamina,
    max_stamina: isSecondPlayer ? state.ai_max_stamina : state.player_max_stamina,
    combat_statuses: (isSecondPlayer ? state.ai_statuses : state.player_statuses).filter(
      (status) => status.persistent,
    ),
    equipped_weapon_id: isSecondPlayer ? state.ai_weapon?.id ?? null : state.player_weapon?.id ?? null,
    equipped_armor_id: isSecondPlayer ? state.ai_armor?.id ?? null : state.player_armor?.id ?? null,
    equipped_item_id: null,
  })
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
    allocateAttributes,
    setEquipment,
    completeQuest,
    tradeItem,
    craftItems,
    useItem,
    learnSkillBook,
    equipSkills,
    castExplorationSkill,
    learnTrainerSkill,
    refreshProfile,
    syncExploration,
    syncCombat,
  }
}
