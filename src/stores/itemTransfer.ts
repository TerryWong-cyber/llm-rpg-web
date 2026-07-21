import { readonly, ref } from 'vue'
import type { ItemType } from '../contracts'

export interface TransferItem {
  id: string
  type: ItemType
  name: string
  count: number
  icon: string
  imageUrl?: string
  canBeIngredient: boolean
  equipped: boolean
}

export type CraftIngredientAddResult = 'added' | 'full' | 'forbidden' | 'equipped' | 'unavailable' | 'reserve'

const selected = ref<TransferItem | null>(null)
const dragging = ref(false)
const craftIngredients = ref<[TransferItem | null, TransferItem | null]>([null, null])

function select(item: TransferItem): void {
  selected.value = item
}

function beginDrag(item: TransferItem, dataTransfer?: DataTransfer | null): void {
  select(item)
  dragging.value = true
  if (dataTransfer) {
    dataTransfer.effectAllowed = 'move'
    dataTransfer.setData('text/plain', `${item.type}:${item.id}`)
  }
}

function endDrag(): void { dragging.value = false }
function clear(): void { selected.value = null; dragging.value = false }

function selectedCraftCount(item: TransferItem, excludeIndex?: number): number {
  return craftIngredients.value.filter((entry, index) => (
    index !== excludeIndex && entry?.type === item.type && entry.id === item.id
  )).length
}

function validateCraftIngredient(item: TransferItem, excludeIndex?: number): CraftIngredientAddResult {
  if (!item.canBeIngredient) return 'forbidden'
  if (item.equipped) return 'equipped'
  const selectedCount = selectedCraftCount(item, excludeIndex)
  if (selectedCount >= item.count) return 'unavailable'
  // if ((item.type === 'weapon' || item.type === 'armor') && item.count - selectedCount <= 1) return 'reserve'
  return 'added'
}

function placeCraftIngredient(index: 0 | 1, item: TransferItem): CraftIngredientAddResult {
  const validation = validateCraftIngredient(item, index)
  if (validation !== 'added') return validation
  const next: [TransferItem | null, TransferItem | null] = [...craftIngredients.value]
  next[index] = { ...item }
  craftIngredients.value = next
  return 'added'
}

function addCraftIngredient(item: TransferItem): CraftIngredientAddResult {
  const index = craftIngredients.value.findIndex((entry) => entry === null)
  if (index < 0) return 'full'
  return placeCraftIngredient(index as 0 | 1, item)
}

function removeCraftIngredient(index: 0 | 1): void {
  const next: [TransferItem | null, TransferItem | null] = [...craftIngredients.value]
  next[index] = null
  craftIngredients.value = next
}

function clearCraftIngredients(): void { craftIngredients.value = [null, null] }

export function useItemTransferStore() {
  return {
    selected: readonly(selected),
    dragging: readonly(dragging),
    craftIngredients: readonly(craftIngredients),
    select,
    beginDrag,
    endDrag,
    clear,
    addCraftIngredient,
    placeCraftIngredient,
    removeCraftIngredient,
    clearCraftIngredients,
  }
}
