<template>
  <section class="world-overview-panel">
    <div class="world-grid" :style="worldGridStyle">
      <article
        v-for="region in worldRegions"
        :key="region.region_id"
        class="world-region"
        :class="{ 'world-region--current': region.region_id === exploration.state.value?.map.region_id }"
        :title="`${region.name} · ${region.climate}`"
      >
        <span><img :src="regionIcon(region.region_id)" alt="" /></span>
        <div><strong>{{ region.name }}</strong><small>{{ region.climate }}</small></div>
      </article>
    </div>
    <div v-if="currentRegion" class="world-overview-panel__current panel">
      <p class="eyebrow">CURRENT REGION</p>
      <h3>{{ currentRegion.name }}</h3>
      <p>{{ currentRegion.culture }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useExplorationStore } from '../../stores/exploration'

const exploration = useExplorationStore()
const worldRegions = computed(() => Object.values(
  exploration.state.value?.world.regions ?? exploration.templates.value?.regions ?? {},
).sort((a, b) => a.world_y - b.world_y || a.world_x - b.world_x))
const worldGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${exploration.state.value?.world.width ?? exploration.templates.value?.world_grid.width ?? 3}, 1fr)`,
}))
const currentRegion = computed(() => {
  const id = exploration.state.value?.map.region_id
  return id ? (exploration.state.value?.world.regions[id] ?? exploration.templates.value?.regions[id]) : null
})

function regionIcon(id: string): string {
  const images: Record<string, string> = {
    frost_crown: '/assets/vendor/game-icons/lorc/snowflake-2.svg',
    broken_spine: '/assets/vendor/game-icons/lorc/mountains.svg',
    moon_vale: '/assets/vendor/game-icons/delapouite/graveyard.svg',
    western_desert: '/assets/vendor/game-icons/delapouite/desert.svg',
    mistwood: '/assets/vendor/game-icons/delapouite/circle-forest.svg',
    emerald_coast: '/assets/vendor/game-icons/delapouite/island.svg',
    amber_steppe: '/assets/vendor/game-icons/delapouite/grass.svg',
    silver_marsh: '/assets/vendor/game-icons/delapouite/swamp.svg',
    ashlands: '/assets/vendor/game-icons/lorc/volcano.svg',
  }
  return images[id] ?? '/assets/vendor/game-icons/delapouite/grass.svg'
}
</script>
