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

const selected = ref<TransferItem | null>(null)
const dragging = ref(false)

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

export function useItemTransferStore() {
  return { selected: readonly(selected), dragging: readonly(dragging), select, beginDrag, endDrag, clear }
}
