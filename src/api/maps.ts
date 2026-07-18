import type {
  CellRequest,
  DirectionRequest,
  EatRequest,
  EnterMapRequest,
  EventActionRequest,
  EventActionResponse,
  GatherResponse,
  MapStateResponse,
  MapTemplatesResponse,
  RestResponse,
} from '../contracts'
import { apiRequest } from './client'
import { normalizeCombatSnapshot, normalizeMapState } from './normalizers'

export function getMapTemplates(): Promise<MapTemplatesResponse> {
  return apiRequest('/api/map/templates')
}

export async function enterMap(payload: EnterMapRequest): Promise<MapStateResponse> {
  return normalizeMapState(await apiRequest('/api/map/enter', { method: 'POST', body: payload }))
}

export async function move(payload: CellRequest): Promise<MapStateResponse> {
  return normalizeMapState(await apiRequest('/api/map/move', { method: 'POST', body: payload }))
}

export async function moveDirection(payload: DirectionRequest): Promise<MapStateResponse> {
  return normalizeMapState(await apiRequest('/api/map/move-direction', { method: 'POST', body: payload }))
}

export async function gather(payload: CellRequest): Promise<GatherResponse> {
  const response = await apiRequest<GatherResponse>('/api/map/gather', { method: 'POST', body: payload })
  return normalizeMapState(response) as GatherResponse
}

export async function eat(payload: EatRequest): Promise<RestResponse> {
  return normalizeMapState(await apiRequest('/api/map/eat', { method: 'POST', body: payload })) as RestResponse
}

export async function camp(playerId: string): Promise<RestResponse> {
  return normalizeMapState(await apiRequest('/api/map/camp', {
    method: 'POST',
    body: { player_id: playerId },
  })) as RestResponse
}

export async function restAtInn(playerId: string): Promise<RestResponse> {
  return normalizeMapState(await apiRequest('/api/map/inn', {
    method: 'POST',
    body: { player_id: playerId },
  })) as RestResponse
}

export async function eventAction(payload: EventActionRequest): Promise<EventActionResponse> {
  const response = await apiRequest<EventActionResponse>('/api/map/event-action', {
    method: 'POST',
    body: payload,
  })
  const normalized = normalizeMapState(response) as EventActionResponse
  if (normalized.combat) normalized.combat.snapshot = normalizeCombatSnapshot(normalized.combat.snapshot)
  return normalized
}
