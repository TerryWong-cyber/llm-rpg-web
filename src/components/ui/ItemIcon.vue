<template>
  <span class="item-icon" :class="{ 'item-icon--image': imageUrl && !failed }" aria-hidden="true">
    <img v-if="imageUrl && !failed" :src="imageUrl" alt="" @error="failed = true" />
    <span v-else>{{ fallback }}</span>
  </span>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  imageUrl?: string
  fallback?: string
}>(), {
  imageUrl: '',
  fallback: '✦',
})

const failed = ref(false)
watch(() => props.imageUrl, () => { failed.value = false })
</script>
