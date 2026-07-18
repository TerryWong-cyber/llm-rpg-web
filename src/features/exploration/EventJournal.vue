<template>
  <details v-if="eventLog.length" class="event-journal panel" open>
    <summary>
      <span><small>WORLD EVENT JOURNAL</small><strong>世界事件记录</strong></span>
      <b>{{ eventLog.length }} 条</b>
    </summary>
    <div class="event-journal__list">
      <article v-for="entry in eventLog" :key="entry.log_id">
        <span>{{ entry.emoji }}</span>
        <div>
          <small>{{ phaseLabel(entry.phase) }} · {{ locationLabel(entry.region_id, entry.cell_id) }} · {{ dateLabel(entry) }}</small>
          <strong>{{ entry.title }}</strong>
          <p>{{ entry.description }}</p>
        </div>
      </article>
    </div>
  </details>
  <div v-else class="empty-state empty-state--compact event-journal-empty"><span>◇</span><p>尚无世界事件记录。</p></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useExplorationStore } from '../../stores/exploration'

const exploration = useExplorationStore()
const eventLog = computed(() => [...(exploration.state.value?.event_log ?? [])].reverse().slice(0, 30))

function phaseLabel(phase: string): string {
  return ({ triggered: '事件触发', action: '采取行动', expired: '状态变化' } as Record<string, string>)[phase] ?? '事件记录'
}
function locationLabel(regionId: string, cellId: number): string {
  const region = exploration.state.value?.world.regions[regionId]?.name ?? regionId
  return `${region} · 地图格 ${cellId}`
}
function dateLabel(entry: { year: number; month: number; day: number; hour: number }): string {
  return `公元 ${entry.year} 年 ${entry.month} 月 ${entry.day} 日 ${String(entry.hour).padStart(2, '0')}:00`
}
</script>
