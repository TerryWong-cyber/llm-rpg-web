import type {
  MemoryEntry,
  NpcCombatStartResponse,
  NpcDialogueResponse,
  NpcRelationship,
  PublicNpc,
} from '../contracts'
import { apiRequest } from './client'
import { normalizeCombatSnapshot } from './normalizers'

export function getNpcs(query: { terrain_id?: string; cell_id?: number } = {}): Promise<{ npcs: PublicNpc[] }> {
  return apiRequest('/api/world/npcs', { query })
}

export function getNpc(npcId: string, playerId: string): Promise<{ npc: PublicNpc; relationship: NpcRelationship }> {
  return apiRequest(`/api/world/npcs/${encodeURIComponent(npcId)}`, { query: { player_id: playerId } })
}

export function dialogue(npcId: string, playerId: string, message: string): Promise<NpcDialogueResponse> {
  return apiRequest(`/api/world/npcs/${encodeURIComponent(npcId)}/dialogue`, {
    method: 'POST',
    body: { player_id: playerId, message },
  })
}

export function getNpcMemories(npcId: string, playerId: string): Promise<{ npc_id: string; memories: MemoryEntry[] }> {
  return apiRequest(`/api/world/npcs/${encodeURIComponent(npcId)}/memories`, {
    query: { player_id: playerId },
  })
}

export function getPlayerMemories(playerId: string): Promise<{ player_id: string; memories: MemoryEntry[] }> {
  return apiRequest(`/api/world/players/${encodeURIComponent(playerId)}/memories`)
}

export function getWorldFacts(): Promise<{ facts: MemoryEntry[] }> {
  return apiRequest('/api/world/facts')
}

export async function startNpcCombat(
  npcId: string,
  playerId: string,
  triggerId: string,
): Promise<NpcCombatStartResponse> {
  const response = await apiRequest<NpcCombatStartResponse>(
    `/api/world/npcs/${encodeURIComponent(npcId)}/combat/start`,
    { method: 'POST', body: { player_id: playerId, trigger_id: triggerId } },
  )
  return { ...response, snapshot: normalizeCombatSnapshot(response.snapshot) }
}
