<template>
  <section class="feature-stack inventory-dropzone" :class="{ 'drop-target-active': selectedTransfer?.equipped }" @dragover.prevent @drop.prevent="unequipSelected">
    <nav class="segmented inventory-tabs" aria-label="行囊分类">
      <span class="inventory-tabs__buttons">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >{{ tab.label }} <span>{{ countFor(tab.id) }}</span></button>
      </span>
      <strong class="inventory-tabs__gold">◈ {{ player.profile.value?.gold ?? 0 }} 金币</strong>
    </nav>

    <div v-if="items.length" class="inventory-grid" @click="closeDetails">
      <InventorySlot
        v-for="item in items"
        :key="`${item.type}-${item.id}`"
        :active="activeItemKey === `${item.type}-${item.id}`"
        :icon="item.icon"
        :image-url="item.imageUrl"
        :name="item.name"
        :count="item.count"
        :equipped="item.equipped"
        :selected="selectedTransfer?.id === item.id && selectedTransfer?.type === item.type"
        draggable
        @preview="activeItemKey = `${item.type}-${item.id}`"
        @toggle="selectItem(item)"
        @doubleclick="quickAddToCraft(item)"
        @dragstart="transfer.beginDrag(item, $event.dataTransfer)"
        @dragend="transfer.endDrag"
      >
        <aside class="inventory-popover" role="dialog" :aria-label="`${item.name}详情`" @click.stop>
          <header><span>{{ item.icon }}</span><div><small>{{ typeLabels[item.type] }} · {{ item.category }}<template v-if="item.equipped"> · 装备中</template></small><h3>{{ item.name }}</h3></div><b>× {{ item.count }}</b></header>
          <p>{{ item.desc || '远境档案中暂未留下描述。' }}</p>
          <dl>
            <div><dt>价值</dt><dd>{{ item.value }} 金币</dd></div>
            <div><dt>交易</dt><dd>{{ item.tradable ? '可交易' : '不可交易' }}</dd></div>
            <div><dt>炼金</dt><dd>{{ item.canBeIngredient ? '可作为材料' : '不可合成' }}</dd></div>
            <div><dt>使用场景</dt><dd>{{ contextLabel(item.useContexts) }}</dd></div>
          </dl>
          <div v-if="item.tags.length" class="inventory-popover__tags"><span v-for="tag in item.tags" :key="tag">{{ tag }}</span></div>
          <button v-if="item.type === 'weapon' || item.type === 'armor'" class="button" :class="item.equipped ? 'button--ghost' : 'button--primary'" type="button" :disabled="player.busy.value" @click="toggleEquipment(item)">{{ item.equipped ? '卸下' : '装备' }}</button>
          <button v-if="item.type === 'item' && item.useContexts.includes('exploration')" class="button button--primary" type="button" :disabled="player.busy.value" @click="useItem(item)">在探索中使用</button>
          <button v-if="item.type === 'item' && item.learnSkillId" class="button button--gold" type="button" :disabled="player.busy.value" @click="learnBook(item)">研读并学习</button>
          <button v-if="props.craftingOpen && item.canBeIngredient" class="button button--gold" type="button" @click="quickAddToCraft(item)">放入合成</button>
        </aside>
      </InventorySlot>
    </div>
    <div v-else class="empty-state"><span>◇</span><h3>此页尚为空白</h3><p>探索荒野、交易或炼金都可能带回新的发现。</p></div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { ItemType, ItemUseContext } from '../../contracts'
import InventorySlot from '../../components/ui/InventorySlot.vue'
import { useCatalogStore, type CatalogItemSummary } from '../../stores/catalog'
import { usePlayerStore } from '../../stores/player'
import { useItemTransferStore } from '../../stores/itemTransfer'
import { useNotificationsStore } from '../../stores/notifications'

type InventoryTab = 'weapons' | 'armors' | 'items' | 'materials'
interface ViewItem { id: string; type: ItemType; name: string; desc?: string; value: number; count: number; icon: string; imageUrl?: string; tradable: boolean; canBeIngredient: boolean; useContexts: ItemUseContext[]; category: string; tags: string[]; equipped: boolean; learnSkillId?: string }

const props = defineProps<{ craftingOpen?: boolean }>()
const player = usePlayerStore()
const catalog = useCatalogStore()
const transfer = useItemTransferStore()
const notifications = useNotificationsStore()
const selectedTransfer = computed(() => transfer.selected.value)
const activeTab = ref<InventoryTab>('weapons')
const activeItemKey = ref('')
const typeLabels: Record<ItemType, string> = { weapon: '武器', armor: '护甲', item: '道具', material: '素材' }
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
    return item ? [{ id, type: 'weapon', name: item.name, desc: item.desc, value: item.value, count, icon: '⚔', imageUrl: item.imageUrl, equipped: inventory.weapons.includes(id) && player.profile.value?.equipped_weapon_id === id, ...policy(item) }] : []
  })
  if (activeTab.value === 'armors') return Object.entries(tally(inventory.armors)).flatMap(([id, count]) => {
    const item = catalog.itemSummary('armor', id)
    return item ? [{ id, type: 'armor', name: item.name, desc: item.desc, value: item.value, count, icon: '◈', imageUrl: item.imageUrl, equipped: inventory.armors.includes(id) && player.profile.value?.equipped_armor_id === id, ...policy(item) }] : []
  })
  if (activeTab.value === 'items') return Object.entries(inventory.items).flatMap(([id, count]) => {
    const item = catalog.itemSummary('item', id)
    return item && count > 0 ? [{ id, type: 'item', name: item.name, desc: item.desc, value: item.value, count, icon: item.category === 'skill_book' ? '📖' : '⚗', imageUrl: item.imageUrl, equipped: false, learnSkillId: catalog.meta.value?.items[id]?.learn_skill_id, ...policy(item) }] : []
  })
  return Object.entries(inventory.materials).flatMap(([id, count]) => {
    const item = catalog.itemSummary('material', id)
    return item && count > 0 ? [{ id, type: 'material', name: item.name, desc: item.desc, value: item.value, count, icon: item.emoji || '✦', imageUrl: item.imageUrl, equipped: false, ...policy(item) }] : []
  })
})

function countFor(tab: InventoryTab): number {
  const inventory = player.profile.value?.inventory
  if (!inventory) return 0
  if (tab === 'weapons' || tab === 'armors') return inventory[tab].length
  return Object.values(inventory[tab]).reduce((sum, count) => sum + count, 0)
}

function policy(item: CatalogItemSummary) {
  return {
    tradable: item.tradable,
    canBeIngredient: item.canBeIngredient,
    useContexts: item.useContexts,
    category: item.category,
    tags: item.tags,
  }
}

function selectItem(item: ViewItem): void {
  const key = `${item.type}-${item.id}`
  transfer.select(item)
  activeItemKey.value = activeItemKey.value === key ? '' : key
}

function quickAddToCraft(item: ViewItem): void {
  if (!props.craftingOpen || !item.canBeIngredient) return
  const outcome = transfer.addCraftIngredient(item)
  const failures = {
    full: '炼金槽已满，请先取下已有原料。',
    forbidden: '这件物品不可作为炼金原料。',
    equipped: '正在装备的物品需先卸下。',
    unavailable: '该物品已全部放入炼金台。',
    reserve: `必须保留一件${item.type === 'weapon' ? '武器' : '护甲'}。`,
  } as const
  if (outcome !== 'added') {
    notifications.show(failures[outcome], 'warning')
    return
  }
  transfer.clear()
  closeDetails()
  notifications.show(`已将「${item.name}」放入炼金槽。`, 'success')
}

function closeDetails(): void { activeItemKey.value = '' }

function contextLabel(contexts: ItemUseContext[]): string {
  if (!contexts.length) return '不可主动使用'
  const labels: Record<ItemUseContext, string> = { combat: '战斗中', exploration: '战斗外', world_event: '事件中' }
  return contexts.map((item) => labels[item]).join('、')
}

async function useItem(item: ViewItem): Promise<void> {
  if (await player.useItem(item.id)) {
    transfer.clear()
    closeDetails()
  }
}

async function learnBook(item: ViewItem): Promise<void> {
  if (await player.learnSkillBook(item.id)) {
    transfer.clear()
    closeDetails()
  }
}

async function toggleEquipment(item: ViewItem): Promise<void> {
  if (item.type !== 'weapon' && item.type !== 'armor') return
  if (await player.setEquipment(item.type, item.equipped ? null : item.id)) {
    transfer.clear()
    closeDetails()
  }
}

async function unequipSelected(): Promise<void> {
  const item = transfer.selected.value
  if (!item?.equipped || (item.type !== 'weapon' && item.type !== 'armor')) return
  if (await player.setEquipment(item.type, null)) transfer.clear()
}

onMounted(() => document.addEventListener('click', closeDetails))
onUnmounted(() => document.removeEventListener('click', closeDetails))
</script>
