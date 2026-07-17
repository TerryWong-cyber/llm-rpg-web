<template>
  <section class="hub">
    <header class="hub-hero">
      <div class="hub-hero__copy">
        <p class="eyebrow">THE WAYFARER'S CAMP</p>
        <h1>欢迎回来，{{ player.profile.value?.name }}</h1>
        <p>你的足迹停在 <strong>{{ currentPlace }}</strong>。选择下一段旅程，远境会保存每一次真实结果。</p>
      </div>
      <div class="hero-summary">
        <div><small>契约</small><strong>{{ characterName }}</strong></div>
        <div><small>金币</small><strong>◈ {{ player.profile.value?.gold ?? 0 }}</strong></div>
        <div><small>记忆</small><strong>{{ world.worldFacts.value.length }}</strong></div>
      </div>
    </header>

    <nav class="hub-nav" aria-label="冒险营地导航">
      <button v-for="tab in tabs" :key="tab.id" type="button" :class="{ active: modelValue === tab.id }" @click="selectTab(tab.id)">
        <span>{{ tab.icon }}</span><span><strong>{{ tab.label }}</strong><small>{{ tab.hint }}</small></span>
      </button>
    </nav>

    <main class="hub-content">
      <ExplorationPanel v-if="modelValue === 'explore'" @encounter="openEncounter" />
      <NpcPanel v-else-if="modelValue === 'npcs'" />
      <RoomPanel v-else-if="modelValue === 'battle'" />
      <InventoryPanel v-else-if="modelValue === 'inventory'" />
      <ShopPanel v-else-if="modelValue === 'shop'" />
      <CraftingPanel v-else-if="modelValue === 'craft'" />
    </main>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CraftingPanel from '../crafting/CraftingPanel.vue'
import ExplorationPanel from '../exploration/ExplorationPanel.vue'
import InventoryPanel from '../inventory/InventoryPanel.vue'
import NpcPanel from '../npc/NpcPanel.vue'
import RoomPanel from '../combat/RoomPanel.vue'
import ShopPanel from '../shop/ShopPanel.vue'
import { useCatalogStore } from '../../stores/catalog'
import { useExplorationStore } from '../../stores/exploration'
import { usePlayerStore } from '../../stores/player'
import { useWorldStore } from '../../stores/world'

export type HubTab = 'explore' | 'npcs' | 'battle' | 'inventory' | 'shop' | 'craft'

const props = defineProps<{ modelValue: HubTab }>()
const emit = defineEmits<{ 'update:modelValue': [tab: HubTab] }>()
const player = usePlayerStore()
const catalog = useCatalogStore()
const exploration = useExplorationStore()
const world = useWorldStore()
const tabs: Array<{ id: HubTab; icon: string; label: string; hint: string }> = [
  { id: 'explore', icon: '⌖', label: '荒野探索', hint: '移动与采集' },
  { id: 'npcs', icon: '♙', label: '世界人物', hint: '对话与记忆' },
  { id: 'battle', icon: '⚔', label: '战备大厅', hint: 'PvE / PvP' },
  { id: 'inventory', icon: '◇', label: '旅人行囊', hint: '查看库存' },
  { id: 'shop', icon: '◈', label: '鎏金集市', hint: '买入与售出' },
  { id: 'craft', icon: '✧', label: '星辉炼金', hint: '创造新物品' },
]

const characterName = computed(() => {
  const id = player.profile.value?.character_id
  return id ? catalog.meta.value?.characters[id]?.name ?? id : '未记录'
})
const currentPlace = computed(() => {
  const map = exploration.state.value?.map ?? player.profile.value?.current_map
  if (!map) return '冒险营地'
  return exploration.templates.value?.regions[map.region_id]?.name ?? map.region_id
})

async function selectTab(tab: HubTab): Promise<void> {
  emit('update:modelValue', tab)
  if (tab === 'npcs' && !world.npcs.value.length) await world.loadWorld()
  if (tab === 'explore' && !exploration.templates.value) await exploration.loadTemplates()
}

async function openEncounter(npcId: string): Promise<void> {
  if (!world.npcs.value.length) await world.loadWorld()
  await world.selectNpc(npcId)
  emit('update:modelValue', 'npcs')
}
</script>
