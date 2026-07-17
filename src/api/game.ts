import type {
  CombatSnapshot,
  CraftRequest,
  CraftResponse,
  CreateCharacterRequest,
  CreateCharacterResponse,
  GameMeta,
  RecipesResponse,
  TradeRequest,
  TradeResponse,
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

export function getRecipes(): Promise<RecipesResponse> {
  return apiRequest('/api/game/recipes', {
    cache: 'no-store',
    query: { _refresh: Date.now() },
  })
}
