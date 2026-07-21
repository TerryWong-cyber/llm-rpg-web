<template>
  <section class="feature-stack">
    <div class="feature-toolbar">
      <small>失败不会消耗原料</small>
      <button class="button button--ghost" type="button" @click="openRecipes">炼金图鉴 {{ successRecipes.length }} 成功 · {{ failedRecipes.length }} 失败</button>
    </div>

    <div class="craft-board panel">
      <div class="craft-slots">
        <button class="craft-slot" :class="{ filled: first, 'drop-target-active': canAcceptSelected }" type="button" @dragover.prevent @drop.prevent="putSelected(0)" @click="first ? removeIngredient(0) : putSelected(0)">
          <ItemIcon class="craft-slot__icon" :image-url="first?.imageUrl" :fallback="first?.icon ?? '◇'" />
          <strong>{{ first?.name ?? '第一件原料' }}</strong>
          <small>{{ first ? '点击取回' : '从旅人行囊拖入或选择' }}</small>
        </button>
        <span class="craft-plus" aria-hidden="true">✦</span>
        <button class="craft-slot" :class="{ filled: second, 'drop-target-active': canAcceptSelected }" type="button" @dragover.prevent @drop.prevent="putSelected(1)" @click="second ? removeIngredient(1) : putSelected(1)">
          <ItemIcon class="craft-slot__icon" :image-url="second?.imageUrl" :fallback="second?.icon ?? '◇'" />
          <strong>{{ second?.name ?? '第二件原料' }}</strong>
          <small>{{ second ? '点击取回' : '从旅人行囊拖入或选择' }}</small>
        </button>
      </div>
      <button class="button button--primary button--large" type="button" :disabled="!first || !second || player.busy.value" @click="craft">
        {{ player.busy.value ? '正在推演造物…' : '开始炼成' }}
      </button>

      <article v-if="result" class="craft-result">
        <ItemIcon v-if="resultImageUrl" class="craft-result__icon" :image-url="resultImageUrl" fallback="✧" />
        <span v-else class="craft-result__sigil">✧</span>
        <div><p class="eyebrow">NEW CREATION</p><h3>{{ result.name }}</h3><p>{{ result.desc }}</p><p class="craft-duration">⌛ 本次炼成耗时 {{ formatDuration(attemptDurationMs) }}{{ recipeCached ? ' · 复用已知配方' : ' · 首次推演' }}{{ result.image_status === 'fallback' ? ' · 拼接图降级' : '' }}</p><small>{{ labelFor(result.item_type) }} · 类别 {{ result.category }} · 估值 ◈ {{ result.value }} · {{ propertySummary(result) }} · {{ result.tradable ? '可交易' : '不可交易' }} · {{ result.can_be_ingredient ? '可继续作为原料' : '完整成品，不可继续炼制' }} · 场景 {{ result.use_contexts.join(' / ') || '无' }} · 标签 {{ result.tags.join('、') || '无' }}</small></div>
      </article>
      <article v-else-if="failureReason" class="craft-result craft-result--failed">
        <span class="craft-result__sigil">×</span>
        <div><p class="eyebrow">INCOMPATIBLE FORMULA</p><h3>炼成失败</h3><p>{{ failureReason }}</p><p class="craft-duration">⌛ 本次推演耗时 {{ formatDuration(attemptDurationMs) }}{{ recipeCached ? ' · 复用已知结论' : ' · 首次推演' }}</p><small>原料未被消耗，该结论已记录到全局图鉴。</small></div>
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
                <span class="recipe-outcome"><strong>{{ recipe.result?.name }}</strong><small>首次推演 {{ formatDuration(recipe.duration_ms) }}</small></span>
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
                <span class="recipe-failure"><strong>无法炼成</strong><small>{{ recipe.failure_reason }}</small><small>首次推演 {{ formatDuration(recipe.duration_ms) }}</small></span>
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
import { computed, onUnmounted, ref } from 'vue'
import type { CraftResult, ItemType } from '../../contracts'
import { imageUrlFor } from '../../assets/craftImageCache'
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
const first = computed(() => transfer.craftIngredients.value[0])
const second = computed(() => transfer.craftIngredients.value[1])
const result = ref<CraftResult | null>(null)
const failureReason = ref('')
const attemptDurationMs = ref(0)
const recipeCached = ref(false)
const resultImageUrl = computed(() => result.value ? imageUrlFor(result.value.image_url, result.value.image_key) : '')
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
  const outcome = transfer.placeCraftIngredient(index, item)
  if (outcome !== 'added') {
    notifications.show(reasonForOutcome(outcome, item), 'warning')
    return
  }
  transfer.clear()
}

function removeIngredient(index: 0 | 1): void { transfer.removeCraftIngredient(index) }

function reasonForOutcome(outcome: Exclude<ReturnType<typeof transfer.placeCraftIngredient>, 'added'>, item: Ingredient): string {
  if (outcome === 'full') return '炼金槽已满，请先取下已有原料。'
  if (outcome === 'forbidden') return '这件物品不可作为炼金原料'
  if (outcome === 'equipped') return '正在装备的物品需先卸下'
  if (outcome === 'unavailable') return '该物品已全部放入炼金台'
  return `必须保留一件${item.type === 'weapon' ? '武器' : '护甲'}`
}

async function craft(): Promise<void> {
  if (!first.value || !second.value) return
  const attempt = await player.craftItems(first.value, second.value)
  if (!attempt) return
  attemptDurationMs.value = attempt.duration_ms
  recipeCached.value = attempt.recipe_cached
  if (attempt.status === 'failed') {
    result.value = null
    failureReason.value = attempt.failure_reason
    return
  }
  result.value = attempt.result
  failureReason.value = ''
  transfer.clearCraftIngredients()
}

async function openRecipes(): Promise<void> {
  showRecipes.value = true
  await catalog.loadRecipes()
}

function labelFor(type: ItemType): string {
  return ({ weapon: '武器', armor: '护甲', item: '药剂', material: '素材' })[type]
}

function propertySummary(crafted: CraftResult): string {
  const properties = crafted.properties
  if (crafted.item_type === 'weapon') return `攻击 ${properties.base_dmg ?? crafted.combat_stat} · ${properties.damage_type ?? 'phys'} · ${properties.range ?? '近战'}`
  if (crafted.item_type === 'armor') return `生命 +${properties.hp_bonus ?? crafted.combat_stat} · 减伤 ${Math.round(Number(properties.def_rate ?? 0) * 100)}%`
  if (crafted.item_type === 'item') return `效果 ${properties.effect_type ?? 'unknown'} · 强度 ${properties.val ?? crafted.combat_stat}`
  return '精炼材料'
}

function ingredientName(type: ItemType, id: string): string {
  const meta = catalog.meta.value
  if (!meta) return id
  const groups = { weapon: meta.weapons, armor: meta.armors, item: meta.items, material: meta.resources }
  return groups[type][id]?.name ?? id
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) return `${Math.max(1, Math.round(durationMs))} 毫秒`
  return `${(durationMs / 1000).toFixed(durationMs < 10_000 ? 2 : 1)} 秒`
}

onUnmounted(() => transfer.clearCraftIngredients())
</script>
