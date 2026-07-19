import type {
  CombatSnapshot,
  CraftRequest,
  CraftResponse,
  CreateCharacterRequest,
  CreateCharacterResponse,
  GameMeta,
  ProfileUpdateResponse,
  RecipesResponse,
  TradeRequest,
  TradeResponse,
  UseItemResponse,
  EquipmentRequest,
  TrainerSkillOffer,
} from '../contracts'
import { apiRequest } from './client'
import { normalizeCombatSnapshot, normalizeGameMeta, normalizeProfile } from './normalizers'

export async function getGameMeta(forceFresh = false): Promise<GameMeta> {
  return normalizeGameMeta(await apiRequest('/api/game/meta', forceFresh ? {
    cache: 'no-store',
    query: { _refresh: Date.now() },
  } : {}))
}

export async function createCharacter(payload: CreateCharacterRequest): Promise<CreateCharacterResponse> {
  const response = await apiRequest<CreateCharacterResponse>('/api/game/character/create', {
    method: 'POST',
    body: payload,
  })
  return { ...response, player_id: String(response.player_id), profile: normalizeProfile(response.profile) }
}

export async function getProfile(playerId: string): Promise<ProfileUpdateResponse> {
  const response = await apiRequest<ProfileUpdateResponse>('/api/game/character/profile', {
    cache: 'no-store',
    query: { player_id: playerId },
  })
  return { ...response, profile: normalizeProfile(response.profile) }
}

export async function allocateAttributes(
  playerId: string,
  allocations: Record<string, number>,
): Promise<ProfileUpdateResponse> {
  const response = await apiRequest<ProfileUpdateResponse>('/api/game/character/allocate', {
    method: 'POST',
    body: { player_id: playerId, allocations },
  })
  return { ...response, profile: normalizeProfile(response.profile) }
}

export async function setEquipment(payload: EquipmentRequest): Promise<ProfileUpdateResponse> {
  const response = await apiRequest<ProfileUpdateResponse>('/api/game/character/equipment', {
    method: 'POST',
    body: payload,
  })
  return { ...response, profile: normalizeProfile(response.profile) }
}

export async function completeQuest(
  playerId: string,
  npcId: string,
  hookId: string,
): Promise<ProfileUpdateResponse> {
  const response = await apiRequest<ProfileUpdateResponse>('/api/game/quest/complete', {
    method: 'POST',
    body: { player_id: playerId, npc_id: npcId, hook_id: hookId },
  })
  return { ...response, profile: normalizeProfile(response.profile) }
}

export async function trade(
  action: 'buy' | 'sell',
  payload: TradeRequest,
): Promise<TradeResponse | CombatSnapshot> {
  const response = await apiRequest<TradeResponse | CombatSnapshot>(`/api/game/shop/${action}`, {
    method: 'POST',
    body: payload,
  })
  if ('room_id' in response && 'state' in response) return normalizeCombatSnapshot(response)
  return { ...response, profile: normalizeProfile(response.profile) }
}

export async function craft(payload: CraftRequest): Promise<CraftResponse> {
  const response = await apiRequest<CraftResponse>('/api/game/craft', { method: 'POST', body: payload })
  return { ...response, profile: normalizeProfile(response.profile) }
}

export async function useItem(playerId: string, itemId: string): Promise<UseItemResponse> {
  const response = await apiRequest<UseItemResponse>('/api/game/use-item', {
    method: 'POST',
    body: { player_id: playerId, item_id: itemId },
  })
  return { ...response, profile: normalizeProfile(response.profile) }
}

export async function equipSkills(playerId: string, skillIds: string[]): Promise<ProfileUpdateResponse> {
  const response = await apiRequest<ProfileUpdateResponse>('/api/game/skills/equip', {
    method: 'POST', body: { player_id: playerId, skill_ids: skillIds },
  })
  return { ...response, profile: normalizeProfile(response.profile) }
}

export async function learnSkillBook(playerId: string, itemId: string): Promise<ProfileUpdateResponse & { skill_id: string }> {
  const response = await apiRequest<ProfileUpdateResponse & { skill_id: string }>('/api/game/skills/learn-book', {
    method: 'POST', body: { player_id: playerId, item_id: itemId },
  })
  return { ...response, profile: normalizeProfile(response.profile) }
}

export async function castExplorationSkill(playerId: string, skillId: string): Promise<ProfileUpdateResponse & { outcome: { skill_id: string; applied_states: string[] } }> {
  const response = await apiRequest<ProfileUpdateResponse & { outcome: { skill_id: string; applied_states: string[] } }>('/api/game/skills/cast-exploration', {
    method: 'POST', body: { player_id: playerId, skill_id: skillId },
  })
  return { ...response, profile: normalizeProfile(response.profile) }
}

export function getTrainerSkills(playerId: string, npcId: string): Promise<{ npc_id: string; offers: TrainerSkillOffer[] }> {
  return apiRequest(`/api/game/skills/trainer/${encodeURIComponent(npcId)}`, {
    cache: 'no-store', query: { player_id: playerId, _refresh: Date.now() },
  })
}

export async function learnTrainerSkill(playerId: string, npcId: string, skillId: string): Promise<ProfileUpdateResponse> {
  const response = await apiRequest<ProfileUpdateResponse>('/api/game/skills/learn-trainer', {
    method: 'POST', body: { player_id: playerId, npc_id: npcId, skill_id: skillId },
  })
  return { ...response, profile: normalizeProfile(response.profile) }
}

export function getRecipes(): Promise<RecipesResponse> {
  return apiRequest('/api/game/recipes', {
    cache: 'no-store',
    query: { _refresh: Date.now() },
  })
}
