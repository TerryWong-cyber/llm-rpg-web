<template>
  <section class="feature-stack exploration-feature">
    <div class="feature-intro">
      <div>
        <p class="eyebrow">WILDLANDS ATLAS</p>
        <h2>荒野探索</h2>
        <p>每次只能前往相邻的可通行地块。脚下的地块可以采集一次。</p>
      </div>
      <div class="map-controls">
        <select v-model="selectedTemplate" aria-label="地图区域">
          <option v-for="template in exploration.templates.value?.templates" :key="template.template_id" :value="template.template_id">
            {{ templateName(template) }} · {{ template.width }}×{{ template.height }}
          </option>
        </select>
        <button class="button button--ghost" type="button" :disabled="exploration.busy.value" @click="enterSelected(false)">
          {{ exploration.state.value ? '进入 / 继续' : '展开地图' }}
        </button>
        <button class="button button--danger-ghost" type="button" :disabled="exploration.busy.value || !exploration.state.value" @click="enterSelected(true)">重置区域</button>
      </div>
    </div>

    <article v-if="exploration.state.value?.encounter" class="encounter-banner">
      <span class="encounter-banner__sigil">✦</span>
      <div><p class="eyebrow">A FATEFUL ENCOUNTER</p><h3>你察觉到附近有一位值得交谈的人</h3><p>探索暂时停在这里。先确认对方身份，再决定如何回应。</p></div>
      <button class="button button--primary" type="button" @click="openEncounter(exploration.state.value.encounter.npc_id)">查看遭遇</button>
    </article>

    <div v-if="exploration.state.value" class="atlas panel">
      <header class="atlas__header">
        <div>
          <p class="eyebrow">{{ regionName }}</p>
          <h3>{{ exploration.state.value.map.width }} × {{ exploration.state.value.map.height }} 探索图</h3>
        </div>
        <div class="atlas__legend"><span><i class="legend-current" />当前位置</span><span><i class="legend-route" />可前往</span><span><i class="legend-blocked" />不可通行</span></div>
      </header>

      <div class="map-scroll" tabindex="0" aria-label="可滚动的探索地图">
        <div class="map-grid" :style="gridStyle">
          <button
            v-for="cell in exploration.state.value.map_grid"
            :key="cell.cell_id"
            class="map-cell"
            :class="cellClass(cell)"
            type="button"
            :disabled="!exploration.canMoveTo(cell)"
            :aria-label="cellLabel(cell)"
            @click="move(cell)"
          >
            <span>{{ terrain(cell.terrain_id)?.emoji ?? '·' }}</span>
            <small>{{ cell.landmark_id ? '⌂' : cell.cell_id }}</small>
          </button>
        </div>
      </div>

      <footer class="atlas__footer">
        <div class="current-place">
          <span class="current-place__icon">{{ terrain(exploration.currentCell.value?.terrain_id)?.emoji ?? '⌖' }}</span>
          <div><small>你所在的位置</small><strong>{{ terrain(exploration.currentCell.value?.terrain_id)?.name ?? '未知地带' }}</strong><span>{{ exploration.currentCell.value?.landmark_id ?? '未标记地块' }}</span></div>
        </div>
        <button class="button button--primary" type="button" :disabled="!canGather" @click="gather">
          {{ exploration.busy.value ? '正在行动…' : exploration.currentCell.value?.gathered ? '此处已采集' : '采集当前地块' }}
        </button>
      </footer>
    </div>

    <div v-else-if="exploration.busy.value" class="empty-state"><span class="spinner" /><h3>地图正在展开</h3><p>远境的道路会依照服务器保存的状态呈现。</p></div>
    <div v-else class="empty-state"><span>⌖</span><h3>尚未进入任何区域</h3><p>选择地图模板，开始或继续一段探索。</p></div>

    <div v-if="materials.length" class="materials-strip">
      <small>采集袋</small><span v-for="material in materials" :key="material.id">{{ material.emoji }} {{ material.name }} <b>×{{ material.count }}</b></span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { MapCell, MapTemplate } from '../../contracts'
import { useExplorationStore } from '../../stores/exploration'
import { usePlayerStore } from '../../stores/player'

const emit = defineEmits<{ encounter: [npcId: string] }>()
const exploration = useExplorationStore()
const player = usePlayerStore()
const selectedTemplate = ref('')

watch(() => exploration.templates.value?.templates, (templates) => {
  if (!selectedTemplate.value && templates?.length) {
    selectedTemplate.value = player.profile.value?.current_map?.template_id ?? templates[0].template_id
  }
}, { immediate: true })

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${exploration.state.value?.map.width ?? 1}, minmax(2.7rem, 1fr))`,
}))
const canGather = computed(() => Boolean(
  exploration.currentCell.value && !exploration.currentCell.value.gathered && !exploration.busy.value,
))
const regionName = computed(() => {
  const map = exploration.state.value?.map
  if (!map) return 'UNCHARTED REGION'
  const region = exploration.templates.value?.regions[map.region_id]
  const world = exploration.templates.value?.worlds[map.world_id]
  return [world?.name, region?.name].filter(Boolean).join(' · ') || map.region_id
})
const materials = computed(() => {
  const state = exploration.state.value
  if (!state) return []
  return Object.entries(state.inventory_materials).filter(([, count]) => count > 0).map(([id, count]) => ({
    id,
    count,
    name: state.resources_meta[id]?.name ?? id,
    emoji: state.resources_meta[id]?.emoji ?? '✦',
  }))
})

function templateName(template: MapTemplate): string {
  return exploration.templates.value?.regions[template.region_id]?.name ?? template.region_id
}

function terrain(id?: string) {
  if (!id) return null
  return exploration.state.value?.terrains_meta[id] ?? null
}

function cellClass(cell: MapCell): Record<string, boolean> {
  return {
    'map-cell--current': cell.cell_id === exploration.state.value?.map.current_cell_id,
    'map-cell--route': exploration.canMoveTo(cell),
    'map-cell--blocked': !cell.passable,
    'map-cell--gathered': cell.gathered,
    'map-cell--unexplored': !cell.explored,
  }
}

function cellLabel(cell: MapCell): string {
  const name = terrain(cell.terrain_id)?.name ?? '未知地形'
  if (cell.cell_id === exploration.state.value?.map.current_cell_id) return `${name}，当前位置`
  return `${name}${cell.passable ? '' : '，不可通行'}${exploration.canMoveTo(cell) ? '，可以前往' : ''}`
}

async function enterSelected(refresh: boolean): Promise<void> {
  const encounter = await exploration.enter(selectedTemplate.value || undefined, refresh)
  if (encounter) emit('encounter', encounter.npc_id)
}

async function move(cell: MapCell): Promise<void> {
  const encounter = await exploration.moveTo(cell)
  if (encounter) emit('encounter', encounter.npc_id)
}

async function gather(): Promise<void> {
  const encounter = await exploration.gatherCurrent()
  if (encounter) emit('encounter', encounter.npc_id)
}

function openEncounter(npcId: string): void {
  emit('encounter', npcId)
}

onMounted(async () => {
  await exploration.loadTemplates()
  if (!selectedTemplate.value) {
    selectedTemplate.value = player.profile.value?.current_map?.template_id
      ?? exploration.templates.value?.templates[0]?.template_id
      ?? ''
  }
  if (!exploration.state.value) await enterSelected(false)
})
</script>
