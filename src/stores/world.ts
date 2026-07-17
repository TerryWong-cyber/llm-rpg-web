import { computed, readonly, ref } from 'vue'
import * as npcApi from '../api/npcs'
import type {
  CombatTrigger,
  MemoryEntry,
  NpcCombatStartResponse,
  NpcRelationship,
  PublicNpc,
  StoryHook,
} from '../contracts'
import { useNotificationsStore } from './notifications'
import { usePlayerStore } from './player'

export interface DialogueLine {
  role: 'player' | 'npc'
  text: string
  tone?: string
}

const npcs = ref<PublicNpc[]>([])
const selectedNpc = ref<PublicNpc | null>(null)
const relationship = ref<NpcRelationship | null>(null)
const memories = ref<MemoryEntry[]>([])
const worldFacts = ref<MemoryEntry[]>([])
const dialogueLog = ref<DialogueLine[]>([])
const combatTrigger = ref<CombatTrigger | null>(null)
const activatedStoryHook = ref<StoryHook | null>(null)
const busy = ref(false)

async function loadWorld(): Promise<void> {
  busy.value = true
  try {
    const [npcResponse, factResponse] = await Promise.all([npcApi.getNpcs(), npcApi.getWorldFacts()])
    npcs.value = npcResponse.npcs ?? []
    worldFacts.value = factResponse.facts ?? []
  } catch (error) {
    useNotificationsStore().capture(error, '世界人物信息加载失败。')
  } finally {
    busy.value = false
  }
}

async function selectNpc(npcId: string, keepDialogue = false): Promise<boolean> {
  const playerId = usePlayerStore().playerId.value
  if (!playerId) return false
  busy.value = true
  try {
    const [npcResponse, memoryResponse] = await Promise.all([
      npcApi.getNpc(npcId, playerId),
      npcApi.getNpcMemories(npcId, playerId),
    ])
    selectedNpc.value = npcResponse.npc
    relationship.value = npcResponse.relationship
    memories.value = memoryResponse.memories ?? []
    combatTrigger.value = null
    activatedStoryHook.value = null
    if (!keepDialogue) dialogueLog.value = []
    return true
  } catch (error) {
    useNotificationsStore().capture(error, '无法读取这位人物的信息。', true)
    return false
  } finally {
    busy.value = false
  }
}

async function talk(message: string): Promise<boolean> {
  const playerId = usePlayerStore().playerId.value
  const npc = selectedNpc.value
  const text = message.trim().slice(0, 500)
  if (!playerId || !npc || !text || busy.value) return false
  busy.value = true
  dialogueLog.value.push({ role: 'player', text })
  try {
    const response = await npcApi.dialogue(npc.npc_id, playerId, text)
    dialogueLog.value.push({ role: 'npc', text: response.reply, tone: response.tone })
    relationship.value = response.relationship
    combatTrigger.value = response.combat_trigger
    activatedStoryHook.value = response.activated_story_hook
    const memoryResponse = await npcApi.getNpcMemories(npc.npc_id, playerId)
    memories.value = memoryResponse.memories ?? []
    return true
  } catch (error) {
    useNotificationsStore().capture(error, '对话没有得到回应。', true)
    return false
  } finally {
    busy.value = false
  }
}

async function beginCombat(): Promise<NpcCombatStartResponse | null> {
  const playerId = usePlayerStore().playerId.value
  if (!playerId || !selectedNpc.value || !combatTrigger.value || busy.value) return null
  busy.value = true
  try {
    return await npcApi.startNpcCombat(
      selectedNpc.value.npc_id,
      playerId,
      combatTrigger.value.trigger_id,
    )
  } catch (error) {
    useNotificationsStore().capture(error, '这场遭遇战暂时无法开始。', true)
    return null
  } finally {
    busy.value = false
  }
}

function resetWorld(): void {
  npcs.value = []
  selectedNpc.value = null
  relationship.value = null
  memories.value = []
  worldFacts.value = []
  dialogueLog.value = []
  combatTrigger.value = null
  activatedStoryHook.value = null
}

export function useWorldStore() {
  return {
    npcs: readonly(npcs),
    selectedNpc: readonly(selectedNpc),
    relationship: readonly(relationship),
    memories: readonly(memories),
    worldFacts: readonly(worldFacts),
    dialogueLog: readonly(dialogueLog),
    combatTrigger: readonly(combatTrigger),
    activatedStoryHook: readonly(activatedStoryHook),
    busy: computed(() => busy.value),
    loadWorld,
    selectNpc,
    talk,
    beginCombat,
    resetWorld,
  }
}
