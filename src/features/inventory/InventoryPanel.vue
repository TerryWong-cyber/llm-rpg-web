<template>
  <section class="feature-stack">
    <div class="feature-intro">
      <div>
        <p class="eyebrow">TRAVELER'S SATCHEL</p>
        <h2>旅人行囊</h2>
        <p>所有物品均以远境档案中的最新记录为准。</p>
      </div>
      <div class="coin-purse"><span>◈</span><strong>{{ player.profile.value?.gold ?? 0 }}</strong><small>金币</small></div>
    </div>

    <nav class="segmented" aria-label="行囊分类">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >{{ tab.label }} <span>{{ countFor(tab.id) }}</span></button>
    </nav>

    <div v-if="items.length" class="item-grid">
      <ItemCard
        v-for="item in items"
        :key="`${item.type}-${item.id}`"
        :icon="item.icon"
        :image-url="item.imageUrl"
        :name="item.name"
        :description="item.desc"
        :count="item.count"
        :value="item.value"
      />
    </div>
    <div v-else class="empty-state"><span>◇</span><h3>此页尚为空白</h3><p>探索荒野、交易或炼金都可能带回新的发现。</p></div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ItemType } from '../../contracts'
import ItemCard from '../../components/ui/ItemCard.vue'
import { useCatalogStore } from '../../stores/catalog'
import { usePlayerStore } from '../../stores/player'

type InventoryTab = 'weapons' | 'armors' | 'items' | 'materials'
interface ViewItem { id: string; type: ItemType; name: string; desc?: string; value: number; count: number; icon: string; imageUrl?: string }

const player = usePlayerStore()
const catalog = useCatalogStore()
const activeTab = ref<InventoryTab>('weapons')
const tabs: Array<{ id: InventoryTab; label: string }> = [
  { id: 'weapons', label: '武器' },
  { id: 'armors', label: '护甲' },
  { id: 'items', label: '药剂' },
  { id: 'materials', label: '素材' },
]

function tally(ids: readonly string[]): Record<string, number> {
  return ids.reduce<Record<string, number>>((result, id) => {
    result[id] = (result[id] ?? 0) + 1
    return result
  }, {})
}

const items = computed<ViewItem[]>(() => {
  const inventory = player.profile.value?.inventory
  if (!inventory) return []
  if (activeTab.value === 'weapons') return Object.entries(tally(inventory.weapons)).flatMap(([id, count]) => {
    const item = catalog.itemSummary('weapon', id)
    return item ? [{ id, type: 'weapon', name: item.name, desc: item.desc, value: item.value, count, icon: '⚔', imageUrl: item.imageUrl }] : []
  })
  if (activeTab.value === 'armors') return Object.entries(tally(inventory.armors)).flatMap(([id, count]) => {
    const item = catalog.itemSummary('armor', id)
    return item ? [{ id, type: 'armor', name: item.name, desc: item.desc, value: item.value, count, icon: '◈', imageUrl: item.imageUrl }] : []
  })
  if (activeTab.value === 'items') return Object.entries(inventory.items).flatMap(([id, count]) => {
    const item = catalog.itemSummary('item', id)
    return item && count > 0 ? [{ id, type: 'item', name: item.name, desc: item.desc, value: item.value, count, icon: '⚗', imageUrl: item.imageUrl }] : []
  })
  return Object.entries(inventory.materials).flatMap(([id, count]) => {
    const item = catalog.itemSummary('material', id)
    return item && count > 0 ? [{ id, type: 'material', name: item.name, desc: item.desc, value: item.value, count, icon: item.emoji || '✦', imageUrl: item.imageUrl }] : []
  })
})

function countFor(tab: InventoryTab): number {
  const inventory = player.profile.value?.inventory
  if (!inventory) return 0
  if (tab === 'weapons' || tab === 'armors') return inventory[tab].length
  return Object.values(inventory[tab]).reduce((sum, count) => sum + count, 0)
}
</script>
