import type {
  CellRequest,
  EnterMapRequest,
  GatherResponse,
  MapStateResponse,
  MapTemplatesResponse,
} from '../contracts'
import { apiRequest } from './client'
import { normalizeMap, normalizeMapState } from './normalizers'

export function getMapTemplates(): Promise<MapTemplatesResponse> {
  return apiRequest('/api/map/templates')
}

export async function enterMap(payload: EnterMapRequest): Promise<MapStateResponse> {
  return normalizeMapState(await apiRequest('/api/map/enter', { method: 'POST', body: payload }))
}

export async function move(payload: CellRequest): Promise<MapStateResponse> {
  return normalizeMapState(await apiRequest('/api/map/move', { method: 'POST', body: payload }))
}

export async function gather(payload: CellRequest): Promise<GatherResponse> {
  const response = await apiRequest<GatherResponse>('/api/map/gather', { method: 'POST', body: payload })
  return {
    ...response,
    map: normalizeMap(response.map),
    inventory_materials: Object.fromEntries(
      Object.entries(response.inventory_materials ?? {}).map(([id, qty]) => [String(id), Number(qty) || 0]),
    ),
  }
}
