<template>
  <section class="feature-stack">
    <div class="feature-intro">
      <div>
        <p class="eyebrow">GILDED CROSSROADS</p>
        <h2>鎏金集市</h2>
        <p>集市只呈报交易意向，最终价格与库存由远境商会确认。</p>
      </div>
      <div class="coin-purse"><span>◈</span><strong>{{ profile?.gold ?? 0 }}</strong><small>可用金币</small></div>
    </div>

    <nav class="segmented" aria-label="商店分类">
      <button v-for="tab in tabs" :key="tab.id" type="button" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">
        {{ tab.label }}
      </button>
    </nav>

    <div class="shop-list">
      <article v-for="item in shopItems" :key="item.id" class="shop-row">
        <ItemIcon class="shop-row__icon" :image-url="item.imageUrl" :fallback="item.icon" />
        <div class="shop-row__copy">
          <h3>{{ item.name }}</h3>
          <p>{{ item.desc }}</p>
          <small>持有 {{ item.owned }}</small>
        </div>
        <div class="shop-row__actions">
          <button class="button button--gold" type="button" :disabled="!canBuy(item) || player.busy.value" @click="trade('buy', item)">
            买入 <b>◈ {{ item.value }}</b>
          </button>
          <button class="button button--ghost" type="button" :disabled="!canSell(item) || player.busy.value" @click="trade('sell', item)">
            售出 <b>商会结算</b>
          </button>
        </div>
      </article>
    </div>

    <p class="rule-note">装备不会重复购入；最后一件武器与护甲会被保留。初始护甲若不可出售，商会将返回明确原因。</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ItemType } from '../../contracts'
import ItemIcon from '../../components/ui/ItemIcon.vue'
import { useCatalogStore } from '../../stores/catalog'
import { usePlayerStore } from '../../stores/player'

interface ShopItem { id: string; type: ItemType; name: string; desc: string; value: number; owned: number; icon: string; imageUrl?: string }

const player = usePlayerStore()
const catalog = useCatalogStore()
const profile = player.profile
const activeTab = ref<ItemType>('weapon')
const tabs: Array<{ id: ItemType; label: string }> = [
  { id: 'weapon', label: '武器' },
  { id: 'armor', label: '护甲' },
  { id: 'item', label: '药剂' },
  { id: 'material', label: '素材回收' },
]

function count(ids: readonly string[], id: string): number {
  return ids.filter((entry) => entry === id).length
}

const shopItems = computed<ShopItem[]>(() => {
  const meta = catalog.meta.value
  const inventory = profile.value?.inventory
  if (!meta || !inventory) return []
  if (activeTab.value === 'weapon') return Object.entries(meta.weapons).map(([id, item]) => ({
    id, type: 'weapon', name: item.name, desc: item.desc, value: item.value, owned: count(inventory.weapons, id), icon: '⚔', imageUrl: item.image_url,
  }))
  if (activeTab.value === 'armor') return Object.entries(meta.armors).map(([id, item]) => ({
    id, type: 'armor', name: item.name, desc: item.desc, value: item.value, owned: count(inventory.armors, id), icon: '◈', imageUrl: item.image_url,
  }))
  if (activeTab.value === 'item') return Object.entries(meta.items).map(([id, item]) => ({
    id, type: 'item', name: item.name, desc: item.desc, value: item.value, owned: inventory.items[id] ?? 0, icon: '⚗', imageUrl: item.image_url,
  }))
  return Object.entries(meta.resources).filter(([id]) => (inventory.materials[id] ?? 0) > 0).map(([id, item]) => ({
    id, type: 'material', name: item.name, desc: item.desc ?? '', value: item.value, owned: inventory.materials[id] ?? 0, icon: item.emoji || '✦', imageUrl: item.image_url,
  }))
})

function canBuy(item: ShopItem): boolean {
  if (item.type === 'material') return false
  if ((item.type === 'weapon' || item.type === 'armor') && item.owned > 0) return false
  return (profile.value?.gold ?? 0) >= item.value
}

function canSell(item: ShopItem): boolean {
  if (!profile.value || item.owned <= 0) return false
  if (item.type === 'weapon') return profile.value.inventory.weapons.length > 1
  if (item.type === 'armor') return profile.value.inventory.armors.length > 1
  return true
}

async function trade(action: 'buy' | 'sell', item: ShopItem): Promise<void> {
  await player.tradeItem(action, item.type, item.id)
}
</script>
