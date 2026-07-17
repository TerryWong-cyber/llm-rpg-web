import { computed, readonly, ref } from 'vue'
import * as mapApi from '../api/maps'
import type { EncounterResult, MapCell, MapStateResponse, MapTemplatesResponse } from '../contracts'
import { normalizeMap } from '../api/normalizers'
import { useNotificationsStore } from './notifications'
import { usePlayerStore } from './player'

const templates = ref<MapTemplatesResponse | null>(null)
const state = ref<MapStateResponse | null>(null)
const busy = ref(false)
const lastGatherMessage = ref('')

async function loadTemplates(): Promise<void> {
  if (templates.value) return
  try {
    templates.value = await mapApi.getMapTemplates()
  } catch (error) {
    useNotificationsStore().capture(error, '地图目录加载失败。')
  }
}

function applyMapState(next: MapStateResponse): void {
  state.value = next
  usePlayerStore().syncExploration(next.map, next.inventory_materials)
}

async function enter(templateId?: string | null, refresh = false): Promise<EncounterResult | null> {
  const playerId = usePlayerStore().playerId.value
  if (!playerId) return null
  busy.value = true
  try {
    const response = await mapApi.enterMap({
      player_id: playerId,
      template_id: templateId || undefined,
      refresh,
    })
    applyMapState(response)
    lastGatherMessage.value = ''
    return response.encounter
  } catch (error) {
    useNotificationsStore().capture(error, '无法进入这片区域。', true)
    return null
  } finally {
    busy.value = false
  }
}

function canMoveTo(cell: MapCell): boolean {
  if (!state.value || busy.value || !cell.passable) return false
  const current = state.value.map_grid.find((item) => item.cell_id === state.value?.map.current_cell_id)
  if (!current) return false
  return Math.abs(current.x - cell.x) + Math.abs(current.y - cell.y) === 1
}

async function moveTo(cell: MapCell): Promise<EncounterResult | null> {
  const playerId = usePlayerStore().playerId.value
  if (!playerId || !canMoveTo(cell)) return null
  busy.value = true
  try {
    const response = await mapApi.move({ player_id: playerId, cell_id: cell.cell_id })
    applyMapState(response)
    return response.encounter
  } catch (error) {
    useNotificationsStore().capture(error, '无法移动到该地块。', true)
    return null
  } finally {
    busy.value = false
  }
}

async function gatherCurrent(): Promise<EncounterResult | null> {
  const playerId = usePlayerStore().playerId.value
  const current = state.value?.map_grid.find((cell) => cell.cell_id === state.value?.map.current_cell_id)
  if (!playerId || !state.value || !current || current.gathered || busy.value) return null
  busy.value = true
  try {
    const response = await mapApi.gather({ player_id: playerId, cell_id: current.cell_id })
    const cells = state.value.map_grid.map((cell) => (
      cell.cell_id === response.cell_id ? { ...cell, gathered: true } : cell
    ))
    const next: MapStateResponse = {
      ...state.value,
      map: { ...normalizeMap(response.map), cells },
      map_grid: cells,
      inventory_materials: response.inventory_materials,
      encounter: response.encounter,
    }
    applyMapState(next)
    lastGatherMessage.value = response.msg
    useNotificationsStore().show(response.msg, 'success')
    return response.encounter
  } catch (error) {
    useNotificationsStore().capture(error, '采集失败。', true)
    return null
  } finally {
    busy.value = false
  }
}

function resetExploration(): void {
  state.value = null
  templates.value = null
  lastGatherMessage.value = ''
}

export function useExplorationStore() {
  return {
    templates: readonly(templates),
    state: readonly(state),
    busy: computed(() => busy.value),
    lastGatherMessage: computed(() => lastGatherMessage.value),
    currentCell: computed(() => state.value?.map_grid.find(
      (cell) => cell.cell_id === state.value?.map.current_cell_id,
    ) ?? null),
    loadTemplates,
    enter,
    canMoveTo,
    moveTo,
    gatherCurrent,
    resetExploration,
  }
}
