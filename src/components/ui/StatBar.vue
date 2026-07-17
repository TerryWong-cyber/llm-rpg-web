<template>
  <div class="stat-bar">
    <div class="stat-bar__label">
      <span>{{ label }}</span>
      <strong>{{ value }}<template v-if="maximum"> / {{ maximum }}</template></strong>
    </div>
    <div class="stat-bar__track" :aria-label="`${label} ${value}`">
      <span class="stat-bar__fill" :class="`stat-bar__fill--${tone}`" :style="{ width: `${percentage}%` }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  label: string
  value: number
  maximum?: number
  tone?: 'health' | 'mana' | 'gold'
}>(), {
  maximum: 0,
  tone: 'health',
})

const percentage = computed(() => {
  if (!props.maximum) return props.value > 0 ? 100 : 0
  return Math.max(0, Math.min(100, (props.value / props.maximum) * 100))
})
</script>
