<template>
  <div class="inventory-slot-wrap" @mouseenter="scheduleOpen" @mouseleave="cancelOpen">
    <button
      ref="anchor"
      class="inventory-slot"
      :class="{ 'inventory-slot--active': active, 'inventory-slot--equipped': equipped, 'inventory-slot--selected': selected }"
      type="button"
      :aria-label="`${name}，数量 ${count}`"
      :aria-expanded="active"
      :draggable="draggable"
      @click.stop="emit('toggle')"
      @dblclick.stop="emit('doubleclick')"
      @dragstart="emit('dragstart', $event)"
      @dragend="emit('dragend')"
    >
      <img v-if="imageUrl" :src="imageUrl" :alt="name">
      <span v-else>{{ icon }}</span>
      <i v-if="equipped" title="装备中">E</i>
      <b v-if="count > 1">{{ count }}</b>
    </button>
    <Teleport to="body">
      <div v-if="active" ref="floating" class="inventory-popover-portal" :style="floatingStyle">
        <slot />
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{ active: boolean; name: string; count: number; icon: string; imageUrl?: string; equipped?: boolean; selected?: boolean; draggable?: boolean }>(), { draggable: false, selected: false })
const emit = defineEmits<{ toggle: []; doubleclick: []; preview: []; dragstart: [event: DragEvent]; dragend: [] }>()
const anchor = ref<HTMLElement | null>(null)
const floating = ref<HTMLElement | null>(null)
const position = ref({ top: 0, left: 0, width: 300 })
const floatingStyle = computed(() => ({ top: `${position.value.top}px`, left: `${position.value.left}px`, width: `${position.value.width}px` }))
let timer: ReturnType<typeof setTimeout> | undefined

function scheduleOpen(): void {
  cancelOpen()
  timer = setTimeout(() => emit('preview'), 1000)
}

function cancelOpen(): void {
  if (timer) clearTimeout(timer)
  timer = undefined
}

async function updatePosition(): Promise<void> {
  if (!props.active || !anchor.value) return
  await nextTick()
  const rect = anchor.value.getBoundingClientRect()
  const width = Math.min(300, window.innerWidth - 24)
  const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12)
  let top = rect.bottom + 8
  const height = floating.value?.offsetHeight ?? 280
  if (top + height > window.innerHeight - 12) top = Math.max(12, rect.top - height - 8)
  position.value = { top, left, width }
}

watch(() => props.active, (active) => { if (active) void updatePosition() })
onMounted(() => {
  window.addEventListener('resize', updatePosition)
  window.addEventListener('scroll', updatePosition, true)
})

onUnmounted(() => {
  cancelOpen()
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition, true)
})
</script>
