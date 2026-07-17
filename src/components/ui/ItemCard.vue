<template>
  <article class="item-card" :class="{ 'item-card--selected': selected }">
    <ItemIcon class="item-card__icon" :image-url="imageUrl" :fallback="icon" />
    <div class="item-card__content">
      <div class="item-card__heading">
        <h3>{{ name }}</h3>
        <span v-if="count !== undefined" class="quantity">×{{ count }}</span>
      </div>
      <p>{{ description || '这件造物尚未留下文字记载。' }}</p>
      <div class="item-card__footer">
        <span v-if="value !== undefined">◈ {{ value }}</span>
        <slot />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import ItemIcon from './ItemIcon.vue'

withDefaults(defineProps<{
  icon?: string
  imageUrl?: string
  name: string
  description?: string
  count?: number
  value?: number
  selected?: boolean
}>(), {
  icon: '✦',
  imageUrl: '',
  description: '',
  count: undefined,
  value: undefined,
  selected: false,
})
</script>
