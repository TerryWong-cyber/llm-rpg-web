import { computed, readonly, ref } from 'vue'
import { CombatSocket } from '../api/combatSocket'
import * as roomApi from '../api/rooms'
import type {
  CombatActionMessage,
  CombatServerEvent,
  CombatSnapshot,
  CombatantView,
  CombatStartResponse,
  PrepMessage,
} from '../contracts'
import { useNotificationsStore } from './notifications'
import { usePlayerStore } from './player'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

const roomId = ref('')
const snapshot = ref<CombatSnapshot | null>(null)
const connectionStatus = ref<ConnectionStatus>('disconnected')
const waitingForSnapshot = ref(false)
const readyPhase = ref<'prep' | 'combat' | null>(null)

let socket: CombatSocket | null = null

function makeSocket(): CombatSocket {
  return new CombatSocket({
    onEvent: handleEvent,
    onDisconnect: handleDisconnect,
    onMalformedMessage: () => useNotificationsStore().show('收到无法识别的战斗消息。', 'error'),
  })
}

async function connect(path: string): Promise<void> {
  socket?.close()
  socket = makeSocket()
  connectionStatus.value = 'connecting'
  await socket.connect(path)
  connectionStatus.value = 'connected'
}

function applySnapshot(next: CombatSnapshot): void {
  snapshot.value = next
  roomId.value = next.room_id
  waitingForSnapshot.value = false
  readyPhase.value = null
  usePlayerStore().syncCombat(next)
}

function handleEvent(message: CombatServerEvent): void {
  if (message.event === 'game_start' || message.event === 'snapshot') {
    applySnapshot(message.snapshot)
    return
  }
  if (message.event === 'player_ready') {
    if (message.player_id === usePlayerStore().playerId.value) {
      readyPhase.value = message.phase
      waitingForSnapshot.value = true
    }
    return
  }
  useNotificationsStore().show(message.msg, 'error')
  waitingForSnapshot.value = false
}

function handleDisconnect(): void {
  socket = null
  roomId.value = ''
  snapshot.value = null
  waitingForSnapshot.value = false
  readyPhase.value = null
  connectionStatus.value = 'disconnected'
  useNotificationsStore().show('战斗连接已断开，房间已失效，请重新创建。', 'warning')
}

function resetRoom(): void {
  socket?.close()
  socket = null
  roomId.value = ''
  snapshot.value = null
  waitingForSnapshot.value = false
  readyPhase.value = null
  connectionStatus.value = 'disconnected'
}

async function startPve(): Promise<boolean> {
  const playerId = usePlayerStore().playerId.value
  if (!playerId) return false
  resetRoom()
  try {
    const created = await roomApi.createRoom(playerId)
    roomId.value = String(created.room_id)
    await connect(`/ws/room/${encodeURIComponent(roomId.value)}/${encodeURIComponent(playerId)}`)
    await roomApi.addAi(roomId.value)
    return true
  } catch (error) {
    resetRoom()
    useNotificationsStore().capture(error, '无法创建人机战斗房间。', true)
    return false
  }
}

async function createPvp(): Promise<boolean> {
  const playerId = usePlayerStore().playerId.value
  if (!playerId) return false
  resetRoom()
  try {
    const created = await roomApi.createRoom(playerId)
    roomId.value = String(created.room_id)
    await connect(`/ws/room/${encodeURIComponent(roomId.value)}/${encodeURIComponent(playerId)}`)
    return true
  } catch (error) {
    resetRoom()
    useNotificationsStore().capture(error, '无法创建决斗房间。', true)
    return false
  }
}

async function joinPvp(targetRoomId: string): Promise<boolean> {
  const playerId = usePlayerStore().playerId.value
  const target = targetRoomId.trim()
  if (!playerId || !target) return false
  resetRoom()
  try {
    await roomApi.joinRoom(target, playerId)
    roomId.value = target
    await connect(`/ws/room/${encodeURIComponent(target)}/${encodeURIComponent(playerId)}`)
    return true
  } catch (error) {
    resetRoom()
    useNotificationsStore().capture(error, '无法加入该决斗房间。', true)
    return false
  }
}

async function startEncounterBattle(response: CombatStartResponse): Promise<boolean> {
  resetRoom()
  roomId.value = response.room_id
  applySnapshot(response.snapshot)
  try {
    await connect(response.websocket_path)
    return true
  } catch (error) {
    resetRoom()
    useNotificationsStore().capture(error, '遭遇战连接失败。', true)
    return false
  }
}

const startNpcBattle = startEncounterBattle

function submitPrep(payload: Omit<PrepMessage, 'action'>): void {
  try {
    socket?.send({ action: 'prep', ...payload })
    waitingForSnapshot.value = true
  } catch (error) {
    useNotificationsStore().capture(error, '装备提交失败。')
  }
}

function submitAction(actionKey: CombatActionMessage['action_key']): void {
  if (snapshot.value?.game_over || snapshot.value?.next_node !== 'PlayerAction') return
  try {
    socket?.send({ action: 'combat', action_key: String(actionKey) })
    waitingForSnapshot.value = true
  } catch (error) {
    useNotificationsStore().capture(error, '战斗指令发送失败。')
  }
}

function combatants(): { me: CombatantView | null; enemy: CombatantView | null } {
  if (!snapshot.value) return { me: null, enemy: null }
  const state = snapshot.value.state
  const isSecondPlayer = state.p2_id === usePlayerStore().playerId.value
  const first: CombatantView = {
    id: state.p1_id,
    gold: state.player_gold,
    inventory: state.player_inventory,
    class: state.player_class,
    race: state.player_race,
    raceSkills: state.player_race_skills,
    weapon: state.player_weapon,
    armor: state.player_armor,
    item: state.player_item,
    itemCount: state.player_item_count,
    hp: state.player_hp,
    maxHp: state.player_max_hp,
    mp: state.player_mp,
    maxMp: state.player_max_mp,
    stamina: state.player_stamina,
    maxStamina: state.player_max_stamina,
    status: state.player_status,
    statuses: state.player_statuses,
    stats: state.player_stats,
  }
  const second: CombatantView = {
    id: state.p2_id,
    gold: state.ai_gold,
    inventory: state.ai_inventory,
    class: state.ai_class,
    race: state.ai_race,
    raceSkills: state.ai_race_skills,
    weapon: state.ai_weapon,
    armor: state.ai_armor,
    item: state.ai_item,
    itemCount: state.ai_item_count,
    hp: state.ai_hp,
    maxHp: state.ai_max_hp,
    mp: state.ai_mp,
    maxMp: state.ai_max_mp,
    stamina: state.ai_stamina,
    maxStamina: state.ai_max_stamina,
    status: state.ai_status,
    statuses: state.ai_statuses,
    stats: state.ai_stats,
  }
  return isSecondPlayer ? { me: second, enemy: first } : { me: first, enemy: second }
}

export function useCombatStore() {
  return {
    roomId: computed(() => roomId.value),
    snapshot: readonly(snapshot),
    connectionStatus: computed(() => connectionStatus.value),
    waitingForSnapshot: computed(() => waitingForSnapshot.value),
    readyPhase: computed(() => readyPhase.value),
    inCombat: computed(() => snapshot.value !== null),
    me: computed(() => combatants().me),
    enemy: computed(() => combatants().enemy),
    startPve,
    createPvp,
    joinPvp,
    startNpcBattle,
    startEncounterBattle,
    submitPrep,
    submitAction,
    leaveRoom: resetRoom,
  }
}
