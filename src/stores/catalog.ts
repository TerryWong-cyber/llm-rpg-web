import { computed, readonly, ref } from 'vue'
import { getGameMeta, getRecipes } from '../api/game'
import type { CraftResult, GameMeta, ItemType, RecipeRecord } from '../contracts'
import { useNotificationsStore } from './notifications'

export interface CatalogItemSummary {
  id: string
  itemType: ItemType
  name: string
  desc: string
  value: number
  imageUrl?: string
  emoji?: string
  canBeIngredient: boolean
}

const meta = ref<GameMeta | null>(null)
const recipes = ref<RecipeRecord[]>([])
const recentCrafts = ref<Record<string, CraftResult>>({})
const loading = ref(false)
const loadingRecipes = ref(false)

async function loadCatalog(force = false): Promise<GameMeta | null> {
  if (meta.value && !force) return meta.value
  loading.value = true
  try {
    meta.value = await getGameMeta(force)
    return meta.value
  } catch (error) {
    useNotificationsStore().capture(error, '冒险目录加载失败。')
    return null
  } finally {
    loading.value = false
  }
}

function rememberCraftResult(result: CraftResult): void {
  recentCrafts.value = { ...recentCrafts.value, [result.id]: result }
}

function itemSummary(itemType: ItemType, itemId: string): CatalogItemSummary | null {
  const catalog = meta.value
  if (catalog) {
    if (itemType === 'weapon') {
      const item = catalog.weapons[itemId]
      if (item) return {
        id: item.id,
        itemType,
        name: item.name,
        desc: item.desc,
        value: item.value,
        imageUrl: item.image_url,
        canBeIngredient: item.can_be_ingredient,
      }
    } else if (itemType === 'armor') {
      const item = catalog.armors[itemId]
      if (item) return {
        id: item.id,
        itemType,
        name: item.name,
        desc: item.desc,
        value: item.value,
        imageUrl: item.image_url,
        canBeIngredient: item.can_be_ingredient,
      }
    } else if (itemType === 'item') {
      const item = catalog.items[itemId]
      if (item) return {
        id: item.id,
        itemType,
        name: item.name,
        desc: item.desc,
        value: item.value,
        imageUrl: item.image_url,
        canBeIngredient: item.can_be_ingredient,
      }
    } else {
      const item = catalog.resources[itemId]
      if (item) return {
        id: item.id,
        itemType,
        name: item.name,
        desc: item.desc ?? '',
        value: item.value,
        imageUrl: item.image_url,
        emoji: item.emoji,
        canBeIngredient: item.can_be_ingredient,
      }
    }
  }
  const crafted = recentCrafts.value[itemId]
  if (!crafted || crafted.item_type !== itemType) return null
  return {
    id: crafted.id,
    itemType,
    name: crafted.name,
    desc: crafted.desc,
    value: crafted.value,
    imageUrl: crafted.image_url,
    emoji: itemType === 'material' ? '✦' : undefined,
    canBeIngredient: crafted.can_be_ingredient,
  }
}

async function loadRecipes(): Promise<RecipeRecord[]> {
  loadingRecipes.value = true
  try {
    const response = await getRecipes()
    recipes.value = response.recipes ?? []
    return recipes.value
  } catch (error) {
    useNotificationsStore().capture(error, '炼金图鉴加载失败。')
    return []
  } finally {
    loadingRecipes.value = false
  }
}

export function useCatalogStore() {
  return {
    meta: readonly(meta),
    recipes: readonly(recipes),
    loading: computed(() => loading.value),
    loadingRecipes: computed(() => loadingRecipes.value),
    ready: computed(() => meta.value !== null),
    loadCatalog,
    loadRecipes,
    rememberCraftResult,
    itemSummary,
  }
}
