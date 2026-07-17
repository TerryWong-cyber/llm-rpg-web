import type { AddAiResponse, CreateRoomResponse, JoinRoomResponse } from '../contracts'
import { apiRequest } from './client'

export function createRoom(playerId: string): Promise<CreateRoomResponse> {
  return apiRequest('/api/room/create', { method: 'POST', body: { player_id: playerId } })
}

export function joinRoom(roomId: string, playerId: string): Promise<JoinRoomResponse> {
  return apiRequest('/api/room/join', { method: 'POST', body: { room_id: roomId, player_id: playerId } })
}

export function addAi(roomId: string): Promise<AddAiResponse> {
  return apiRequest('/api/room/add_ai', { method: 'POST', body: { room_id: roomId } })
}
