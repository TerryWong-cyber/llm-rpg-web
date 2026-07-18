<template>
  <section class="hub">
    <nav class="hub-launcher" aria-label="冒险功能">
      <button
        v-for="item in launchers"
        :key="item.id"
        type="button"
        :class="{ active: isOpen(item.id) }"
        @click="toggleWindow(item.id)"
      >
        <span>{{ item.icon }}</span><strong>{{ item.label }}</strong><small>{{ item.hint }}</small>
      </button>
    </nav>

    <main class="hub-content">
      <ExplorationPanel @encounter="openEncounter" @shop="openShop" @world-overview="openWindow('world')" />
    </main>

    <div v-if="windows.length" class="workspace-windows" aria-label="已打开的功能窗口">
      <WorkspaceWindow v-if="isOpen('growth')" title="角色成长" eyebrow="CHARACTER GROWTH" @close="closeWindow('growth')"><GrowthPanel @inventory="openWindow('inventory')" /></WorkspaceWindow>
      <WorkspaceWindow v-if="isOpen('tasks')" title="任务与事件" eyebrow="QUESTS & EVENTS" @close="closeWindow('tasks')"><NpcPanel /></WorkspaceWindow>
      <WorkspaceWindow v-if="isOpen('inventory')" title="旅人行囊" eyebrow="TRAVELER'S SATCHEL" @close="closeWindow('inventory')"><InventoryPanel /></WorkspaceWindow>
      <WorkspaceWindow v-if="isOpen('craft')" title="星辉炼金" eyebrow="ALCHEMY" @close="closeWindow('craft')"><CraftingPanel /></WorkspaceWindow>
      <WorkspaceWindow v-if="isOpen('shop')" title="鎏金集市" eyebrow="GILDED CROSSROADS" @close="closeWindow('shop')"><ShopPanel /></WorkspaceWindow>
      <WorkspaceWindow v-if="isOpen('battle')" title="战备大厅" eyebrow="HALL OF CHALLENGES" @close="closeWindow('battle')"><RoomPanel /></WorkspaceWindow>
      <WorkspaceWindow v-if="isOpen('world')" title="九域方位" eyebrow="WORLD OVERVIEW" @close="closeWindow('world')"><WorldOverviewPanel /></WorkspaceWindow>
    </div>
  </section>
</template>

<script setup lang="ts">
import WorkspaceWindow from '../../components/ui/WorkspaceWindow.vue'
import { useExplorationStore } from '../../stores/exploration'
import { useWorldStore } from '../../stores/world'
import GrowthPanel from '../character/GrowthPanel.vue'
import RoomPanel from '../combat/RoomPanel.vue'
import CraftingPanel from '../crafting/CraftingPanel.vue'
import ExplorationPanel from '../exploration/ExplorationPanel.vue'
import WorldOverviewPanel from '../exploration/WorldOverviewPanel.vue'
import InventoryPanel from '../inventory/InventoryPanel.vue'
import NpcPanel from '../npc/NpcPanel.vue'
import ShopPanel from '../shop/ShopPanel.vue'

export type HubWindow = 'growth' | 'tasks' | 'inventory' | 'craft' | 'shop' | 'battle' | 'world'

const windows = defineModel<HubWindow[]>('windows', { required: true })
const exploration = useExplorationStore()
const world = useWorldStore()
const launchers: Array<{ id: HubWindow; icon: string; label: string; hint: string }> = [
  { id: 'growth', icon: '✦', label: '角色成长', hint: '升级与加点' },
  { id: 'tasks', icon: '♙', label: '任务与事件', hint: '对话、记忆与故事' },
  { id: 'inventory', icon: '◇', label: '旅人行囊', hint: '查看库存' },
  { id: 'craft', icon: '✧', label: '星辉炼金', hint: '创造新物品' },
]

function isOpen(id: HubWindow): boolean { return windows.value.includes(id) }
function closeWindow(id: HubWindow): void { windows.value = windows.value.filter((entry) => entry !== id) }
async function openWindow(id: HubWindow): Promise<void> {
  if (!isOpen(id)) windows.value = [...windows.value, id]
  if (id === 'tasks' && !world.npcs.value.length) await world.loadWorld()
}
async function toggleWindow(id: HubWindow): Promise<void> {
  if (isOpen(id)) {
    closeWindow(id)
    return
  }
  if (id === 'craft') {
    const additions: HubWindow[] = []
    if (!isOpen('inventory')) additions.push('inventory')
    additions.push('craft')
    windows.value = [...windows.value, ...additions]
    return
  }
  await openWindow(id)
}
function openShop(): void {
  if (exploration.shopAvailable.value) void openWindow('shop')
}
async function openEncounter(npcId: string): Promise<void> {
  if (!world.npcs.value.length) await world.loadWorld()
  await world.selectNpc(npcId)
  await openWindow('tasks')
}
</script>
