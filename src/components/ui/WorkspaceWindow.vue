<template>
  <section class="workspace-window" role="dialog" :aria-labelledby="titleId">
    <header class="workspace-window__header">
      <div>
        <p class="eyebrow">{{ eyebrow }}</p>
        <h2 :id="titleId">{{ title }}</h2>
      </div>
      <button class="icon-button" type="button" :aria-label="`关闭${title}`" @click="emit('close')">×</button>
    </header>
    <div class="workspace-window__body"><slot /></div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ title: string; eyebrow: string }>()
const emit = defineEmits<{ close: [] }>()
const titleId = computed(() => `workspace-window-${props.title.replace(/\s+/g, '-').toLowerCase()}`)
</script>
