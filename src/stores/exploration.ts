import { computed, readonly, ref } from 'vue'
import * as mapApi from '../api/maps'
import type {
  DayPeriod,
  EncounterResult,
  EventActionResponse,
  MapCell,
  MapStateResponse,
  MapTemplatesResponse,
  MoveDirection,
  Season,
  WorldTimeSnapshot,
} from '../contracts'
import { useNotificationsStore } from './notifications'
import { usePlayerStore } from './player'

const templates = ref<MapTemplatesResponse | null>(null)
const state = ref<MapStateResponse | null>(null)
const busy = ref(false)
const lastGatherMessage = ref('')
const clockTick = ref(Date.now())
let clockTimer: number | null = null

function startClock(): void {
  if (clockTimer !== null || typeof window === 'undefined') return
  clockTimer = window.setInterval(() => { clockTick.value = Date.now() }, 1000)
}

async function loadTemplates(): Promise<void> {
  if (templates.value) return
  try {
    templates.value = await mapApi.getMapTemplates()
    startClock()
  } catch (error) {
    useNotificationsStore().capture(error, '地图目录加载失败。')
  }
}

function applyMapState(next: MapStateResponse): void {
  state.value = next
  usePlayerStore().syncExploration(next.map, next.inventory_materials, next.player)
  startClock()
  if (next.transition) {
    const destination = next.world.regions[next.transition.to_region_id]?.name ?? next.transition.to_region_id
    useNotificationsStore().show(`你已越过边界，进入「${destination}」。`, 'success')
  }
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
  return performMove(() => mapApi.move({ player_id: playerId, cell_id: cell.cell_id }))
}

async function moveDirection(direction: MoveDirection): Promise<EncounterResult | null> {
  const playerId = usePlayerStore().playerId.value
  if (!playerId || !state.value || busy.value) return null
  return performMove(() => mapApi.moveDirection({ player_id: playerId, direction }))
}

async function performMove(request: () => Promise<MapStateResponse>): Promise<EncounterResult | null> {
  busy.value = true
  try {
    const response = await request()
    applyMapState(response)
    return response.encounter
  } catch (error) {
    useNotificationsStore().capture(error, '无法向该方向移动。', true)
    return null
  } finally {
    busy.value = false
  }
}

async function gatherCurrent(): Promise<EncounterResult | null> {
  const playerId = usePlayerStore().playerId.value
  const current = state.value?.map_grid.find((cell) => cell.cell_id === state.value?.map.current_cell_id)
  if (!playerId || !state.value || !current || !gatherAvailableNow() || busy.value) return null
  busy.value = true
  try {
    const response = await mapApi.gather({ player_id: playerId, cell_id: current.cell_id })
    applyMapState(response)
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

async function camp(): Promise<void> {
  const playerId = usePlayerStore().playerId.value
  if (!playerId || !state.value || busy.value) return
  busy.value = true
  try {
    const response = await mapApi.camp(playerId)
    applyMapState(response)
    useNotificationsStore().show('你完成了一次扎营休息，生命、法力与精力得到部分恢复。', 'success')
  } catch (error) {
    useNotificationsStore().capture(error, '这次扎营没有成功。', true)
  } finally {
    busy.value = false
  }
}

async function restAtInn(): Promise<void> {
  const playerId = usePlayerStore().playerId.value
  if (!playerId || !state.value?.actions.inn.available || busy.value) return
  busy.value = true
  try {
    const response = await mapApi.restAtInn(playerId)
    applyMapState(response)
    useNotificationsStore().show('旅店的完整休整恢复了全部资源，并清除了持续异常。', 'success')
  } catch (error) {
    useNotificationsStore().capture(error, '当前无法使用旅店休整。', true)
  } finally {
    busy.value = false
  }
}

async function eat(itemId: string): Promise<void> {
  const playerId = usePlayerStore().playerId.value
  if (!playerId || !state.value?.actions.eat.available || busy.value) return
  busy.value = true
  try {
    const response = await mapApi.eat({ player_id: playerId, item_id: itemId })
    applyMapState(response)
    useNotificationsStore().show('你吃下补给，恢复了一些精力。', 'success')
  } catch (error) {
    useNotificationsStore().capture(error, '无法使用这份补给。', true)
  } finally {
    busy.value = false
  }
}

async function resolveEventAction(eventId: string, actionId: string): Promise<EventActionResponse | null> {
  const playerId = usePlayerStore().playerId.value
  if (!playerId || !state.value || busy.value) return null
  busy.value = true
  try {
    const response = await mapApi.eventAction({
      player_id: playerId,
      event_id: eventId,
      action_id: actionId,
    })
    applyMapState(response)
    return response
  } catch (error) {
    useNotificationsStore().capture(error, '无法完成这个事件行动。', true)
    return null
  } finally {
    busy.value = false
  }
}

function advanceWorldTime(base: WorldTimeSnapshot | undefined): WorldTimeSnapshot | null {
  void clockTick.value
  if (!base) return null
  const elapsed = Math.max(0, Date.now() - Date.parse(base.observed_at)) / 1000
  const totalHours = base.total_game_hours + Math.floor(elapsed / base.real_seconds_per_game_hour)
  const hoursPerMonth = 24 * 30
  const hoursPerYear = hoursPerMonth * 12
  const year = Math.floor(totalHours / hoursPerYear)
  const withinYear = totalHours % hoursPerYear
  const monthIndex = Math.floor(withinYear / hoursPerMonth)
  const withinMonth = withinYear % hoursPerMonth
  const day = Math.floor(withinMonth / 24) + 1
  const hour = withinMonth % 24
  const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter']
  const season = seasons[Math.floor(monthIndex / 3)]
  let period: DayPeriod = 'night'
  if (hour >= 5 && hour < 7) period = 'dawn'
  else if (hour >= 7 && hour < 18) period = 'day'
  else if (hour >= 18 && hour < 20) period = 'dusk'
  return {
    ...base,
    total_game_hours: totalHours,
    year,
    month: monthIndex + 1,
    day,
    hour,
    season,
    period,
    is_day: period !== 'night',
  }
}

function resetExploration(): void {
  state.value = null
  templates.value = null
  lastGatherMessage.value = ''
}

function gatherAvailableNow(): boolean {
  const value = state.value
  const time = advanceWorldTime(value?.world_time)
  if (!value || !time) return false
  const cell = value.map_grid.find((item) => item.cell_id === value.map.current_cell_id)
  const terrain = cell ? value.terrains_meta[cell.terrain_id] : null
  if (!cell || !terrain || !cell.gatherable || cell.gathered) return false
  if (value.player.stamina < (value.actions.gather.cost ?? 0)) return false
  return terrain.gather_rules.some((rule) => (
    (!rule.conditions?.periods?.length || rule.conditions.periods.includes(time.period))
    && (!rule.conditions?.seasons?.length || rule.conditions.seasons.includes(time.season))
  ))
}

export function useExplorationStore() {
  const currentCell = computed(() => state.value?.map_grid.find(
    (cell) => cell.cell_id === state.value?.map.current_cell_id,
  ) ?? null)
  const currentWorldTime = computed(() => advanceWorldTime(
    state.value?.world_time ?? templates.value?.world_time,
  ))
  const shopAvailable = computed(() => {
    if (!state.value?.actions.shop.available) return false
    const terrain = currentCell.value ? state.value.terrains_meta[currentCell.value.terrain_id] : null
    const periods = terrain?.shop_conditions?.periods
    return !periods?.length || Boolean(currentWorldTime.value && periods.includes(currentWorldTime.value.period))
  })
  const gatherAvailable = computed(() => gatherAvailableNow())
  const campAvailable = computed(() => {
    const value = state.value
    const time = currentWorldTime.value
    const resourcesFull = Boolean(value
      && value.player.stamina >= value.player.max_stamina
      && value.player.current_hp >= value.player.max_hp
      && value.player.current_mp >= value.player.max_mp)
    if (!value || !time || !currentCell.value?.campable || resourcesFull) return false
    return value.player.last_camped_game_day !== Math.floor(time.total_game_hours / 24)
  })
  return {
    templates: readonly(templates),
    state: readonly(state),
    busy: computed(() => busy.value),
    lastGatherMessage: computed(() => lastGatherMessage.value),
    currentCell,
    currentWorldTime,
    shopAvailable,
    gatherAvailable,
    campAvailable,
    innAvailable: computed(() => Boolean(state.value?.actions.inn.available)),
    loadTemplates,
    enter,
    canMoveTo,
    moveTo,
    moveDirection,
    gatherCurrent,
    camp,
    restAtInn,
    eat,
    resolveEventAction,
    resetExploration,
  }
}
