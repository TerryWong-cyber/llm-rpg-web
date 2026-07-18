<template>
  <section class="hub">
    <nav class="hub-nav" aria-label="冒险营地导航">
      <button v-for="tab in tabs" :key="tab.id" type="button" :class="{ active: modelValue === tab.id }" :disabled="isTabDisabled(tab.id)" :title="tabTitle(tab.id)" @click="selectTab(tab.id)">
        <span>{{ tab.icon }}</span><span><strong>{{ tab.label }}</strong><small>{{ tab.hint }}</small></span>
      </button>
    </nav>

    <main class="hub-content">
      <ExplorationPanel v-if="modelValue === 'explore'" @encounter="openEncounter" @shop="openShop" />
      <GrowthPanel v-else-if="modelValue === 'growth'" />
      <NpcPanel v-else-if="modelValue === 'npcs'" />
      <RoomPanel v-else-if="modelValue === 'battle'" />
      <InventoryPanel v-else-if="modelValue === 'inventory'" />
      <ShopPanel v-else-if="modelValue === 'shop'" />
      <CraftingPanel v-else-if="modelValue === 'craft'" />
    </main>
  </section>
</template>

<script setup lang="ts">
import CraftingPanel from '../crafting/CraftingPanel.vue'
import ExplorationPanel from '../exploration/ExplorationPanel.vue'
import GrowthPanel from '../character/GrowthPanel.vue'
import InventoryPanel from '../inventory/InventoryPanel.vue'
import NpcPanel from '../npc/NpcPanel.vue'
import RoomPanel from '../combat/RoomPanel.vue'
import ShopPanel from '../shop/ShopPanel.vue'
import { useExplorationStore } from '../../stores/exploration'
import { useWorldStore } from '../../stores/world'

export type HubTab = 'explore' | 'growth' | 'npcs' | 'battle' | 'inventory' | 'shop' | 'craft'

const props = defineProps<{ modelValue: HubTab }>()
const emit = defineEmits<{ 'update:modelValue': [tab: HubTab] }>()
const exploration = useExplorationStore()
const world = useWorldStore()
const tabs: Array<{ id: HubTab; icon: string; label: string; hint: string }> = [
  { id: 'explore', icon: '⌖', label: '荒野探索', hint: '移动与采集' },
  { id: 'growth', icon: '✦', label: '角色成长', hint: '升级与加点' },
  { id: 'npcs', icon: '♙', label: '世界人物', hint: '对话与记忆' },
  { id: 'battle', icon: '⚔', label: '战备大厅', hint: 'PvE / PvP' },
  { id: 'inventory', icon: '◇', label: '旅人行囊', hint: '查看库存' },
  { id: 'shop', icon: '◈', label: '鎏金集市', hint: '买入与售出' },
  { id: 'craft', icon: '✧', label: '星辉炼金', hint: '创造新物品' },
]

async function selectTab(tab: HubTab): Promise<void> {
  if (isTabDisabled(tab)) return
  emit('update:modelValue', tab)
  if (tab === 'npcs' && !world.npcs.value.length) await world.loadWorld()
  if (tab === 'explore' && !exploration.templates.value) await exploration.loadTemplates()
}

function isTabDisabled(tab: HubTab): boolean {
  return tab === 'shop' && !exploration.shopAvailable.value
}

function tabTitle(tab: HubTab): string {
  if (tab !== 'shop' || exploration.shopAvailable.value) return ''
  return exploration.state.value?.actions.shop.reason ?? '需要在白天抵达村庄或城镇'
}

function openShop(): void {
  if (exploration.shopAvailable.value) emit('update:modelValue', 'shop')
}

async function openEncounter(npcId: string): Promise<void> {
  if (!world.npcs.value.length) await world.loadWorld()
  await world.selectNpc(npcId)
  emit('update:modelValue', 'npcs')
}
</script>
