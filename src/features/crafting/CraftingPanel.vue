<template>
  <section class="feature-stack">
    <div class="feature-toolbar">
      <small>失败不会消耗原料</small>
      <button class="button button--ghost" type="button" @click="openRecipes">炼金图鉴 {{ successRecipes.length }} 成功 · {{ failedRecipes.length }} 失败</button>
    </div>

    <div class="craft-board panel">
      <div class="craft-slots">
        <button class="craft-slot" :class="{ filled: first, 'drop-target-active': canAcceptSelected }" type="button" @dragover.prevent @drop.prevent="putSelected(0)" @click="first ? first = null : putSelected(0)">
          <ItemIcon class="craft-slot__icon" :image-url="first?.imageUrl" :fallback="first?.icon ?? '◇'" />
          <strong>{{ first?.name ?? '第一件原料' }}</strong>
          <small>{{ first ? '点击取回' : '从旅人行囊拖入或选择' }}</small>
        </button>
        <span class="craft-plus" aria-hidden="true">✦</span>
        <button class="craft-slot" :class="{ filled: second, 'drop-target-active': canAcceptSelected }" type="button" @dragover.prevent @drop.prevent="putSelected(1)" @click="second ? second = null : putSelected(1)">
          <ItemIcon class="craft-slot__icon" :image-url="second?.imageUrl" :fallback="second?.icon ?? '◇'" />
          <strong>{{ second?.name ?? '第二件原料' }}</strong>
          <small>{{ second ? '点击取回' : '从旅人行囊拖入或选择' }}</small>
        </button>
      </div>
      <button class="button button--primary button--large" type="button" :disabled="!first || !second || player.busy.value" @click="craft">
        {{ player.busy.value ? '正在推演造物…' : '开始炼成' }}
      </button>

      <article v-if="result" class="craft-result">
        <ItemIcon v-if="result.image_url" class="craft-result__icon" :image-url="result.image_url" fallback="✧" />
        <span v-else class="craft-result__sigil">✧</span>
        <div><p class="eyebrow">NEW CREATION</p><h3>{{ result.name }}</h3><p>{{ result.desc }}</p><small>{{ labelFor(result.item_type) }} · 估值 ◈ {{ result.value }} · 战斗属性 {{ result.combat_stat }} · {{ result.tradable ? '可交易' : '不可交易' }} · {{ result.can_be_ingredient ? '可继续作为原料' : '完整成品，不可继续炼制' }} · 场景 {{ result.use_contexts.join(' / ') || '无' }} · 标签 {{ result.tags.join('、') || '无' }}</small></div>
      </article>
      <article v-else-if="failureReason" class="craft-result craft-result--failed">
        <span class="craft-result__sigil">×</span>
        <div><p class="eyebrow">INCOMPATIBLE FORMULA</p><h3>炼成失败</h3><p>{{ failureReason }}</p><small>原料未被消耗，该结论已记录到全局图鉴。</small></div>
      </article>
    </div>

    <div v-if="showRecipes" class="modal-backdrop" role="presentation" @click.self="showRecipes = false">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="recipe-title">
        <header><div><p class="eyebrow">DISCOVERED FORMULAE</p><h2 id="recipe-title">炼金图鉴</h2></div><button class="icon-button" type="button" aria-label="关闭图鉴" @click="showRecipes = false">×</button></header>
        <div v-if="catalog.loadingRecipes.value" class="empty-state"><span class="spinner" /><p>正在翻阅图鉴…</p></div>
        <div v-else-if="catalog.recipes.value.length" class="recipe-catalog">
          <section v-if="successRecipes.length" class="recipe-section">
            <p class="recipe-section__title">成功配方 · {{ successRecipes.length }}</p>
            <div class="recipe-list">
              <article v-for="(recipe, index) in successRecipes" :key="`${recipe.result?.id ?? 'success'}-${index}`" class="recipe-row">
                <span>{{ ingredientName(recipe.ingredients[0].item_type, recipe.ingredients[0].item_id) }}</span>
                <b>＋</b>
                <span>{{ ingredientName(recipe.ingredients[1].item_type, recipe.ingredients[1].item_id) }}</span>
                <b>→</b>
                <strong>{{ recipe.result?.name }}</strong>
              </article>
            </div>
          </section>
          <details v-if="failedRecipes.length" class="failed-recipes">
            <summary>失败配方 · {{ failedRecipes.length }}（默认折叠）</summary>
            <div class="recipe-list">
              <article v-for="(recipe, index) in failedRecipes" :key="`${recipe.ingredients[0].item_id}-${recipe.ingredients[1].item_id}-${index}`" class="recipe-row recipe-row--failed">
                <span>{{ ingredientName(recipe.ingredients[0].item_type, recipe.ingredients[0].item_id) }}</span>
                <b>＋</b>
                <span>{{ ingredientName(recipe.ingredients[1].item_type, recipe.ingredients[1].item_id) }}</span>
                <b>×</b>
                <span class="recipe-failure"><strong>无法炼成</strong><small>{{ recipe.failure_reason }}</small></span>
              </article>
            </div>
          </details>
        </div>
        <div v-else class="empty-state"><span>✧</span><h3>尚无被记录的公式</h3><p>第一次尝试炼成后，成功或失败配方都会出现在这里。</p></div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CraftResult, ItemType } from '../../contracts'
import ItemIcon from '../../components/ui/ItemIcon.vue'
import { useCatalogStore } from '../../stores/catalog'
import { usePlayerStore } from '../../stores/player'
import { useItemTransferStore, type TransferItem } from '../../stores/itemTransfer'
import { useNotificationsStore } from '../../stores/notifications'

type Ingredient = TransferItem

const player = usePlayerStore()
const catalog = useCatalogStore()
const transfer = useItemTransferStore()
const notifications = useNotificationsStore()
const first = ref<Ingredient | null>(null)
const second = ref<Ingredient | null>(null)
const result = ref<CraftResult | null>(null)
const failureReason = ref('')
const showRecipes = ref(false)
const successRecipes = computed(() => catalog.recipes.value.filter((recipe) => recipe.success && recipe.result))
const failedRecipes = computed(() => catalog.recipes.value.filter((recipe) => !recipe.success))
function tally(ids: readonly string[]): Record<string, number> {
  return ids.reduce<Record<string, number>>((result, id) => {
    result[id] = (result[id] ?? 0) + 1
    return result
  }, {})
}

function selectedCount(type: ItemType, id?: string): number {
  return [first.value, second.value].filter((item) => item?.type === type && (!id || item.id === id)).length
}

function ownedCount(item: Ingredient): number {
  const inventory = player.profile.value?.inventory
  if (!inventory) return 0
  if (item.type === 'weapon' || item.type === 'armor') return tally(inventory[item.type === 'weapon' ? 'weapons' : 'armors'])[item.id] ?? 0
  return inventory[item.type === 'item' ? 'items' : 'materials'][item.id] ?? 0
}

function rejectionReason(item: Ingredient | null): string {
  if (!item) return '请先在旅人行囊中选择物品'
  const equipped = item.type === 'weapon'
    ? player.profile.value?.equipped_weapon_id === item.id
    : item.type === 'armor' && player.profile.value?.equipped_armor_id === item.id
  if (item.equipped || equipped) return '正在装备的物品需先卸下'
  if (!item.canBeIngredient) return '这件物品不可作为炼金原料'
  if (ownedCount(item) - selectedCount(item.type, item.id) <= 0) return '该物品已全部放入炼金台'
  if ((item.type === 'weapon' || item.type === 'armor')) {
    const inventory = player.profile.value?.inventory
    const total = item.type === 'weapon' ? inventory?.weapons.length ?? 0 : inventory?.armors.length ?? 0
    if (total - selectedCount(item.type) <= 1) return `必须保留一件${item.type === 'weapon' ? '武器' : '护甲'}`
  }
  return ''
}

const canAcceptSelected = computed(() => !rejectionReason(transfer.selected.value))

function putSelected(index: 0 | 1): void {
  const item = transfer.selected.value
  const reason = rejectionReason(item)
  if (!item || reason) {
    notifications.show(reason, 'warning')
    return
  }
  result.value = null
  failureReason.value = ''
  if (index === 0) first.value = { ...item }
  else second.value = { ...item }
  transfer.clear()
}

async function craft(): Promise<void> {
  if (!first.value || !second.value) return
  const attempt = await player.craftItems(first.value, second.value)
  if (!attempt) return
  if (attempt.status === 'failed') {
    result.value = null
    failureReason.value = attempt.failure_reason
    return
  }
  result.value = attempt.result
  failureReason.value = ''
  first.value = null
  second.value = null
}

async function openRecipes(): Promise<void> {
  showRecipes.value = true
  await catalog.loadRecipes()
}

function labelFor(type: ItemType): string {
  return ({ weapon: '武器', armor: '护甲', item: '药剂', material: '素材' })[type]
}

function ingredientName(type: ItemType, id: string): string {
  const meta = catalog.meta.value
  if (!meta) return id
  const groups = { weapon: meta.weapons, armor: meta.armors, item: meta.items, material: meta.resources }
  return groups[type][id]?.name ?? id
}
</script>
