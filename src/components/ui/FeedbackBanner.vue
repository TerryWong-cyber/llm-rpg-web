<template>
  <div v-if="notice" class="feedback" :class="`feedback--${notice.tone}`" role="status" aria-live="polite">
    <span class="feedback__mark" aria-hidden="true">{{ icon }}</span>
    <p>{{ notice.message }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useNotificationsStore } from '../../stores/notifications'

const notice = useNotificationsStore().notice
const icon = computed(() => ({
  info: '✦',
  success: '✓',
  warning: '!',
  error: '×',
}[notice.value?.tone ?? 'info']))
</script>
