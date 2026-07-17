<template>
  <section class="feature-stack">
    <div class="feature-intro">
      <div>
        <p class="eyebrow">THE ALCHEMIST'S LEDGER</p>
        <h2>星辉炼金台</h2>
        <p>放入两件造物，由远境法则决定最终产物；失败不会消耗原料。</p>
      </div>
      <button class="button button--ghost" type="button" @click="openRecipes">炼金图鉴 {{ successRecipes.length }} 成功 · {{ failedRecipes.length }} 失败</button>
    </div>

    <div class="craft-board panel">
      <div class="craft-slots">
        <button class="craft-slot" :class="{ filled: first }" type="button" @click="first = null">
          <ItemIcon class="craft-slot__icon" :image-url="first?.imageUrl" :fallback="first?.icon ?? '◇'" />
          <strong>{{ first?.name ?? '第一件原料' }}</strong>
          <small>{{ first ? '点击取回' : '从下方行囊选择' }}</small>
        </button>
        <span class="craft-plus" aria-hidden="true">✦</span>
        <button class="craft-slot" :class="{ filled: second }" type="button" @click="second = null">
          <ItemIcon class="craft-slot__icon" :image-url="second?.imageUrl" :fallback="second?.icon ?? '◇'" />
          <strong>{{ second?.name ?? '第二件原料' }}</strong>
          <small>{{ second ? '点击取回' : '从下方行囊选择' }}</small>
        </button>
      </div>
      <button class="button button--primary button--large" type="button" :disabled="!first || !second || player.busy.value" @click="craft">
        {{ player.busy.value ? '正在推演造物…' : '开始炼成' }}
      </button>

      <article v-if="result" class="craft-result">
        <ItemIcon v-if="result.image_url" class="craft-result__icon" :image-url="result.image_url" fallback="✧" />
        <span v-else class="craft-result__sigil">✧</span>
        <div><p class="eyebrow">NEW CREATION</p><h3>{{ result.name }}</h3><p>{{ result.desc }}</p><small>{{ labelFor(result.item_type) }} · 估值 ◈ {{ result.value }} · 战斗属性 {{ result.combat_stat }} · {{ result.can_be_ingredient ? '可继续作为原料' : '完整成品，不可继续炼制' }}</small></div>
      </article>
      <article v-else-if="failureReason" class="craft-result craft-result--failed">
        <span class="craft-result__sigil">×</span>
        <div><p class="eyebrow">INCOMPATIBLE FORMULA</p><h3>炼成失败</h3><p>{{ failureReason }}</p><small>原料未被消耗，该结论已记录到全局图鉴。</small></div>
      </article>
    </div>

    <div>
      <nav class="segmented" aria-label="炼金原料分类">
        <button v-for="tab in tabs" :key="tab.id" type="button" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">{{ tab.label }}</button>
      </nav>
      <div v-if="availableItems.length" class="ingredient-grid">
        <button
          v-for="item in availableItems"
          :key="`${item.type}-${item.id}`"
          class="ingredient"
          :class="{ 'ingredient--disabled': item.disabled }"
          type="button"
          :disabled="item.disabled"
          @click="putInSlot(item)"
        >
          <ItemIcon :image-url="item.imageUrl" :fallback="item.icon" /><strong>{{ item.name }}</strong><small v-if="item.disabledReason">{{ item.disabledReason }}</small><small v-else>可用 {{ item.count }} · ◈ {{ item.value }}</small>
        </button>
      </div>
      <div v-else class="empty-state empty-state--compact"><span>◇</span><p>当前分类中没有物品。</p></div>
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

interface Ingredient {
  id: string
  type: ItemType
  name: string
  count: number
  value: number
  icon: string
  imageUrl?: string
  disabled: boolean
  disabledReason: string
}

const player = usePlayerStore()
const catalog = useCatalogStore()
const activeTab = ref<ItemType>('material')
const first = ref<Ingredient | null>(null)
const second = ref<Ingredient | null>(null)
const result = ref<CraftResult | null>(null)
const failureReason = ref('')
const showRecipes = ref(false)
const successRecipes = computed(() => catalog.recipes.value.filter((recipe) => recipe.success && recipe.result))
const failedRecipes = computed(() => catalog.recipes.value.filter((recipe) => !recipe.success))
const tabs: Array<{ id: ItemType; label: string }> = [
  { id: 'material', label: '素材' },
  { id: 'item', label: '药剂' },
  { id: 'weapon', label: '武器' },
  { id: 'armor', label: '护甲' },
]

function tally(ids: readonly string[]): Record<string, number> {
  return ids.reduce<Record<string, number>>((result, id) => {
    result[id] = (result[id] ?? 0) + 1
    return result
  }, {})
}

function selectedCount(type: ItemType, id?: string): number {
  return [first.value, second.value].filter((item) => item?.type === type && (!id || item.id === id)).length
}

const availableItems = computed<Ingredient[]>(() => {
  const inventory = player.profile.value?.inventory
  const meta = catalog.meta.value
  if (!inventory || !meta) return []

  if (activeTab.value === 'weapon' || activeTab.value === 'armor') {
    const type = activeTab.value
    const ids = type === 'weapon' ? inventory.weapons : inventory.armors
    const totalRemaining = ids.length - selectedCount(type)
    return Object.entries(tally(ids)).flatMap(([id, rawCount]) => {
      const item = catalog.itemSummary(type, id)
      const count = rawCount - selectedCount(type, id)
      if (!item || rawCount <= 0) return []
      const disabledReason = !item.canBeIngredient
        ? '完整成品，不可作为原料'
        : count <= 0
          ? '已放入炼金台'
          : totalRemaining <= 1
            ? `必须保留一件${type === 'weapon' ? '武器' : '护甲'}`
            : ''
      return [{
        id,
        type,
        name: item.name,
        count: Math.max(0, count),
        value: item.value,
        icon: type === 'weapon' ? '⚔' : '◈',
        imageUrl: item.imageUrl,
        disabled: Boolean(disabledReason),
        disabledReason,
      }]
    })
  }

  const quantities = activeTab.value === 'item' ? inventory.items : inventory.materials
  return Object.entries(quantities).flatMap(([id, rawCount]) => {
    const item = catalog.itemSummary(activeTab.value, id)
    const count = rawCount - selectedCount(activeTab.value, id)
    if (!item || rawCount <= 0) return []
    const disabledReason = !item.canBeIngredient
      ? '完整成品，不可作为原料'
      : count <= 0
        ? '已放入炼金台'
        : ''
    return [{
      id,
      type: activeTab.value,
      name: item.name,
      count: Math.max(0, count),
      value: item.value,
      icon: activeTab.value === 'item' ? '⚗' : (item.emoji || '✦'),
      imageUrl: item.imageUrl,
      disabled: Boolean(disabledReason),
      disabledReason,
    }]
  })
})

function putInSlot(item: Ingredient): void {
  if (item.disabled) return
  result.value = null
  failureReason.value = ''
  if (!first.value) first.value = item
  else if (!second.value) second.value = item
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
  activeTab.value = attempt.result.item_type
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
