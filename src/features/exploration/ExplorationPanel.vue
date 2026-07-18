<template>
  <section class="feature-stack exploration-feature">
    <div class="feature-intro exploration-intro">
      <div>
        <p class="eyebrow">THE NINE REALMS</p>
        <h2>埃尔德兰世界地图</h2>
        <p>九个地域各自拥有不同生态与风土。使用方向键、WASD、地图相邻格或方向盘移动。</p>
      </div>
      <div class="world-status">
        <div class="time-seal"><small>{{ seasonLabel }}</small><strong>{{ timeLabel }}</strong><span>现实 10 秒 = 世界 1 小时</span></div>
        <div class="stamina-card">
          <div><small>探索精力</small><strong>{{ stamina }} / {{ maxStamina }}</strong></div>
          <div class="stamina-meter"><i :style="{ width: `${staminaPercent}%` }" /></div>
        </div>
      </div>
    </div>

    <div class="world-layout">
      <aside class="world-map panel">
        <header><p class="eyebrow">WORLD OVERVIEW</p><h3>九域方位</h3></header>
        <div class="world-grid" :style="worldGridStyle">
          <div
            v-for="region in worldRegions"
            :key="region.region_id"
            class="world-region"
            :class="{ 'world-region--current': region.region_id === exploration.state.value?.map.region_id }"
            :title="`${region.name} · ${region.climate}`"
          ><span><img :src="regionIcon(region.region_id).imageUrl" alt="" /></span><small>{{ region.name }}</small></div>
        </div>
        <p v-if="currentRegion" class="world-culture"><b>{{ currentRegion.climate }}</b>{{ currentRegion.culture }}</p>
      </aside>

      <div class="map-controls panel">
        <template v-if="!exploration.state.value">
          <p>出生地域由种族与国度决定，你会从拥有商人与旅馆的出生城镇开始旅程。</p>
          <button class="button button--primary" type="button" :disabled="exploration.busy.value" @click="enterSelected(false)">前往出生城镇</button>
        </template>
        <template v-else>
          <div class="map-region-card">
            <small>当前区域</small><strong>{{ regionName }}</strong><span>世界坐标 {{ exploration.state.value.map.world_x + 1 }}, {{ exploration.state.value.map.world_y + 1 }} · {{ currentRegion?.climate }}</span>
            <p>{{ currentRegion?.culture }}</p>
            <div class="neighbor-list"><span v-for="neighbor in neighborRegions" :key="neighbor.direction"><b>{{ neighbor.label }}</b>{{ neighbor.name }}</span></div>
          </div>
          <button class="button button--danger-ghost" type="button" :disabled="exploration.busy.value" @click="enterSelected(true)">重新生成世界</button>
        </template>
      </div>
    </div>

    <article v-if="exploration.state.value?.encounter" class="encounter-banner">
      <span class="encounter-banner__sigil">✦</span>
      <div><p class="eyebrow">A FATEFUL ENCOUNTER</p><h3>你察觉到附近有一位值得交谈的人</h3><p>聚落会显著提高相遇概率，但最终结果仍由服务端规则决定。</p></div>
      <button class="button button--primary" type="button" @click="openEncounter(exploration.state.value.encounter.npc_id)">查看遭遇</button>
    </article>

    <article v-if="exploration.state.value?.event" class="world-event" :class="`world-event--${exploration.state.value.event.kind}`">
      <span>{{ exploration.state.value.event.emoji }}</span>
      <div>
        <p class="eyebrow">WORLD EVENT · {{ eventStateLabel(exploration.state.value.event.state) }}</p>
        <h3>{{ exploration.state.value.event.title }}</h3>
        <p>{{ exploration.state.value.event.description }}</p>
        <div v-if="eventParticipant" class="event-participant">
          <ItemIcon class="event-participant__portrait" :image-url="eventParticipant.image_url ?? ''" :fallback="participantFallback" />
          <div class="event-participant__body">
            <small>{{ eventParticipant.type === 'monster' ? `危险等级 ${eventParticipant.combat.threat}` : eventParticipant.race }}</small>
            <strong>{{ eventParticipant.name }} · {{ eventParticipant.title }}</strong>
            <p>{{ eventParticipant.type === 'monster' ? eventParticipant.description : eventParticipant.public_backstory }}</p>
            <div class="event-participant__facts">
              <template v-if="eventParticipant.type === 'monster'">
                <span>生命 {{ eventParticipant.stats.hp }}</span><span>武器 {{ eventParticipant.equipment.weapon_name }}</span><span>护甲 {{ eventParticipant.equipment.armor_name }}</span>
                <span v-for="drop in eventParticipant.drops" :key="`${drop.item_type}:${drop.item_id}`">掉落 {{ dropName(drop.item_type, drop.item_id) }} · {{ Math.round(drop.chance * 100) }}%</span>
              </template>
              <template v-else>
                <span v-for="hook in eventParticipant.story_hooks" :key="hook.hook_id">可触发任务 · {{ hook.title }}</span>
                <span v-if="eventParticipant.has_combat_profile">战斗威胁 {{ eventParticipant.combat_threat }}</span>
              </template>
            </div>
          </div>
        </div>
        <p v-if="exploration.state.value.event.blocks_movement" class="event-forced-warning">此事件封锁了道路，必须先处理才能离开当前地图格。</p>
        <div v-if="exploration.state.value.event.actions.length" class="world-event__actions">
          <button
            v-for="action in exploration.state.value.event.actions"
            :key="action.action_id"
            class="button"
            :class="action.style === 'danger' ? 'button--danger-ghost' : action.style === 'primary' ? 'button--primary' : 'button--ghost'"
            type="button"
            :disabled="exploration.busy.value"
            @click="resolveEventAction(action.action_id)"
          >{{ action.forced ? '必须 · ' : '' }}{{ action.label }}</button>
        </div>
      </div>
    </article>

    <div v-if="exploration.state.value" class="atlas panel">
      <header class="atlas__header">
        <div>
          <p class="eyebrow">{{ regionName }}</p>
          <h3>16 × 16 地域探索图</h3>
        </div>
        <div class="atlas__legend"><span><i class="legend-current" />当前位置</span><span><i class="legend-route" />可前往</span><span><i class="legend-resource" />可采集</span><span><i class="legend-blocked" />不可通行</span></div>
      </header>

      <div class="atlas__body">
        <div ref="mapScroll" class="map-scroll" tabindex="0" aria-label="可滚动的探索地图，支持方向键与 WASD">
          <div class="map-grid" :style="gridStyle">
            <button
              v-for="cell in exploration.state.value.map_grid"
              :key="cell.cell_id"
              class="map-cell"
              :data-cell-id="cell.cell_id"
              :class="[cellClass(cell), `map-cell--terrain-${cell.terrain_id}`]"
              type="button"
              :disabled="!exploration.canMoveTo(cell)"
              :aria-label="cellLabel(cell)"
              @click="move(cell)"
            >
              <span class="map-cell__terrain-icon">
                <img v-if="terrain(cell.terrain_id)?.image_url" :src="terrain(cell.terrain_id)?.image_url" alt="" />
                <template v-else>{{ terrain(cell.terrain_id)?.emoji ?? '·' }}</template>
              </span>
              <ItemIcon
                v-if="cell.cell_id === exploration.state.value?.map.current_cell_id"
                class="map-cell__player-avatar item-icon--portrait"
                :image-url="playerAvatarUrl"
                :fallback="playerInitial"
              />
              <span v-if="cell.active_event_ids.length" class="map-cell__event-marker" title="此处仍有未消失的世界事件">!</span>
              <small>{{ cell.landmark_id ? '⌂' : `${cell.x},${cell.y}` }}</small>
            </button>
          </div>
        </div>

        <aside class="travel-console">
          <div class="direction-pad" aria-label="移动方向">
            <button type="button" aria-label="向上移动" :disabled="directionDisabled('up')" @click="moveDirection('up')">↑</button>
            <button type="button" aria-label="向左移动" :disabled="directionDisabled('left')" @click="moveDirection('left')">←</button>
            <span>⌖</span>
            <button type="button" aria-label="向右移动" :disabled="directionDisabled('right')" @click="moveDirection('right')">→</button>
            <button type="button" aria-label="向下移动" :disabled="directionDisabled('down')" @click="moveDirection('down')">↓</button>
          </div>
          <small>方向键 / WASD</small>
          <p>到达 16×16 边缘后继续前进，即可进入世界地图中相邻的国家或地域。</p>
        </aside>
      </div>

      <footer class="atlas__footer">
        <div class="current-place">
          <ItemIcon class="current-place__icon item-icon--portrait" :image-url="playerAvatarUrl" :fallback="playerInitial" />
          <div>
            <small>你所在的位置</small>
            <strong>{{ terrain(exploration.currentCell.value?.terrain_id)?.name ?? '未知地带' }}</strong>
            <span>{{ terrainDescription }}</span>
          </div>
        </div>
        <div class="field-actions">
          <button class="button button--primary" type="button" :disabled="!canGather" :title="gatherReason" @click="gather">
            {{ exploration.busy.value ? '正在行动…' : `采集 · ${gatherCost} 精力` }}
          </button>
          <button class="button button--ghost" type="button" :disabled="!canCamp" :title="campReason" @click="exploration.camp">⛺ 扎营休息</button>
          <button v-if="exploration.currentCell.value?.interaction_ids.includes('inn')" class="button button--gold" type="button" :disabled="!exploration.innAvailable.value || exploration.busy.value" :title="innReason" @click="exploration.restAtInn">♨ 旅店休整</button>
          <select v-if="foodItems.length" v-model="selectedFood" aria-label="选择食物" :disabled="!exploration.state.value.actions.eat.available">
            <option v-for="food in foodItems" :key="food.id" :value="food.id">{{ food.name }} ×{{ food.count }}（+{{ food.restore }}）</option>
          </select>
          <button v-if="foodItems.length" class="button button--ghost" type="button" :disabled="!selectedFood || !exploration.state.value.actions.eat.available" @click="exploration.eat(selectedFood)">进食</button>
          <button class="button button--gold" type="button" :disabled="!exploration.shopAvailable.value" :title="shopReason" @click="emit('shop')">进入商店</button>
        </div>
      </footer>

      <div class="terrain-ledger">
        <span v-for="tag in exploration.currentCell.value?.tags ?? []" :key="tag"># {{ tag }}</span>
        <div v-if="availableResources.length" class="resource-preview">
          <small>当前时段可发现</small>
          <span v-for="resource in availableResources" :key="resource.id" :class="`resource-preview--${resource.rarity}`" :title="resource.desc">
            <img v-if="resource.imageUrl" :src="resource.imageUrl" alt="" />
            <i v-else>{{ resource.emoji }}</i>
            {{ resource.name }}
            <b>{{ rarityLabel(resource.rarity) }}</b>
          </span>
        </div>
        <span v-else>当前没有可采集资源</span>
      </div>
    </div>

    <div v-else-if="exploration.busy.value" class="empty-state"><span class="spinner" /><h3>世界正在展开</h3><p>地块数量、资源与通路正在根据固定种子生成。</p></div>
    <div v-else class="empty-state"><span>⌖</span><h3>尚未踏上世界地图</h3><p>选择一个初始地域；之后只能通过边界进入相邻国家。</p></div>

    <details v-if="eventLog.length" class="event-journal panel">
      <summary>
        <span><small>WORLD EVENT JOURNAL</small><strong>世界事件记录</strong></span>
        <b>{{ eventLog.length }} 条</b>
      </summary>
      <div class="event-journal__list">
        <article v-for="entry in eventLog" :key="entry.log_id">
          <span>{{ entry.emoji }}</span>
          <div>
            <small>{{ eventPhaseLabel(entry.phase) }} · {{ eventLocationLabel(entry.region_id, entry.cell_id) }} · {{ eventDateLabel(entry) }}</small>
            <strong>{{ entry.title }}</strong>
            <p>{{ entry.description }}</p>
          </div>
        </article>
      </div>
    </details>

    <div v-if="materials.length" class="materials-strip">
      <small>采集袋</small>
      <span v-for="material in materials" :key="material.id" :class="`material-chip--${material.rarity}`" :title="`${categoryLabel(material.category)} · ${rarityLabel(material.rarity)}`">
        <img v-if="material.imageUrl" :src="material.imageUrl" alt="" />
        <i v-else>{{ material.emoji }}</i>
        {{ material.name }} <b>×{{ material.count }}</b>
      </span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { MapCell, MoveDirection } from '../../contracts'
import ItemIcon from '../../components/ui/ItemIcon.vue'
import { useCatalogStore } from '../../stores/catalog'
import { useCombatStore } from '../../stores/combat'
import { useExplorationStore } from '../../stores/exploration'
import { usePlayerStore } from '../../stores/player'

const emit = defineEmits<{ encounter: [npcId: string]; shop: [] }>()
const exploration = useExplorationStore()
const player = usePlayerStore()
const catalog = useCatalogStore()
const combat = useCombatStore()
const selectedFood = ref('')
const mapScroll = ref<HTMLElement | null>(null)

watch(
  () => {
    const map = exploration.state.value?.map
    return map ? `${map.map_id}:${map.current_cell_id}` : ''
  },
  async (location, previous) => {
    if (!location) return
    await nextTick()
    const mapKey = location.slice(0, location.lastIndexOf(':'))
    const previousMapKey = previous?.slice(0, previous.lastIndexOf(':'))
    scrollPlayerIntoView(!previous || mapKey !== previousMapKey)
  },
  { flush: 'post' },
)

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${exploration.state.value?.map.width ?? 1}, minmax(2.43rem, 1fr))`,
}))
const worldGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${exploration.state.value?.world.width ?? exploration.templates.value?.world_grid.width ?? 3}, 1fr)`,
}))
const worldRegions = computed(() => Object.values(
  exploration.state.value?.world.regions ?? exploration.templates.value?.regions ?? {},
).sort((a, b) => a.world_y - b.world_y || a.world_x - b.world_x))
const currentRegion = computed(() => {
  const id = exploration.state.value?.map.region_id
  return id ? (exploration.state.value?.world.regions[id] ?? exploration.templates.value?.regions[id]) : null
})
const neighborRegions = computed(() => {
  const map = exploration.state.value?.map
  const regions = exploration.state.value?.world.regions
  if (!map || !regions) return []
  const directions = [
    { direction: 'up', label: '北', x: map.world_x, y: map.world_y - 1 },
    { direction: 'down', label: '南', x: map.world_x, y: map.world_y + 1 },
    { direction: 'left', label: '西', x: map.world_x - 1, y: map.world_y },
    { direction: 'right', label: '东', x: map.world_x + 1, y: map.world_y },
  ]
  return directions.flatMap((direction) => {
    const region = Object.values(regions).find((item) => item.world_x === direction.x && item.world_y === direction.y)
    return region ? [{ ...direction, name: region.name }] : []
  })
})
const currentTerrain = computed(() => terrain(exploration.currentCell.value?.terrain_id))
const playerRace = computed(() => {
  const id = player.profile.value?.race_id
  return id ? catalog.meta.value?.races[id] : undefined
})
const playerAvatarUrl = computed(() => playerRace.value?.image_url ?? '')
const playerInitial = computed(() => player.profile.value?.name?.slice(0, 1) || '旅')
const currentTime = exploration.currentWorldTime
const stamina = computed(() => exploration.state.value?.player.stamina ?? player.profile.value?.stamina ?? 0)
const maxStamina = computed(() => exploration.state.value?.player.max_stamina ?? player.profile.value?.max_stamina ?? 100)
const staminaPercent = computed(() => Math.max(0, Math.min(100, stamina.value / Math.max(1, maxStamina.value) * 100)))
const seasonLabel = computed(() => ({ spring: '春季', summer: '夏季', autumn: '秋季', winter: '冬季' }[currentTime.value?.season ?? 'spring']))
const timeLabel = computed(() => {
  const time = currentTime.value
  return time ? `公元 ${time.year} 年 · ${time.month} 月 ${time.day} 日 · ${String(time.hour).padStart(2, '0')}:00` : '时间同步中'
})
const canGather = computed(() => Boolean(exploration.gatherAvailable.value && !exploration.busy.value))
const canCamp = computed(() => Boolean(exploration.campAvailable.value && !exploration.busy.value))
const gatherReason = computed(() => exploration.state.value?.actions.gather.reason ?? '')
const campReason = computed(() => exploration.state.value?.actions.camp.reason ?? '')
const innReason = computed(() => exploration.state.value?.actions.inn.reason ?? '')
const shopReason = computed(() => exploration.shopAvailable.value ? '' : (exploration.state.value?.actions.shop.reason || '商店当前未营业'))
const gatherCost = computed(() => exploration.state.value?.actions.gather.cost ?? 0)
const regionName = computed(() => currentRegion.value?.name ?? exploration.state.value?.map.region_id ?? 'UNCHARTED REGION')
const terrainDescription = computed(() => {
  const cell = exploration.currentCell.value
  const meta = currentTerrain.value
  if (!cell || !meta) return '未记录地块'
  const labels = { ordinary: '普通地块', resource: '资源地块', settlement: '聚落地块', interactive: '交互地块', blocked: '阻挡地块' }
  return `${labels[cell.terrain_category]} · 移动消耗 ${cell.movement_cost} 精力${cell.landmark_id ? ` · ${cell.landmark_id}` : ''}`
})
const eventLog = computed(() => [...(exploration.state.value?.event_log ?? [])].reverse().slice(0, 30))
const eventParticipant = computed(() => exploration.state.value?.event?.participant ?? null)
const participantFallback = computed(() => {
  const participant = eventParticipant.value
  return participant?.type === 'monster' ? participant.emoji : participant?.name.slice(0, 1) ?? '？'
})
const materials = computed(() => {
  const state = exploration.state.value
  if (!state) return []
  return Object.entries(state.inventory_materials).filter(([, count]) => count > 0).map(([id, count]) => ({
    id,
    count,
    name: state.resources_meta[id]?.name ?? id,
    emoji: state.resources_meta[id]?.emoji ?? '✦',
    imageUrl: state.resources_meta[id]?.image_url,
    category: state.resources_meta[id]?.category,
    rarity: state.resources_meta[id]?.rarity ?? 'common',
  }))
})
const foodItems = computed(() => {
  const items = player.profile.value?.inventory.items ?? {}
  const meta = catalog.meta.value?.items ?? {}
  return Object.entries(items).flatMap(([id, count]) => {
    const item = meta[id]
    return count > 0 && (item?.stamina_restore ?? 0) > 0
      ? [{ id, count, name: item.name, restore: item.stamina_restore ?? 0 }]
      : []
  })
})
watch(foodItems, (items) => {
  if (!items.some((item) => item.id === selectedFood.value)) selectedFood.value = items[0]?.id ?? ''
}, { immediate: true })
const availableResources = computed(() => {
  const time = currentTime.value
  const state = exploration.state.value
  if (!time || !state || !currentTerrain.value) return []
  return currentTerrain.value.gather_rules.filter((rule) => {
    const periods = rule.conditions?.periods
    const seasons = rule.conditions?.seasons
    const regions = rule.conditions?.regions
    return (!periods?.length || periods.includes(time.period))
      && (!seasons?.length || seasons.includes(time.season))
      && (!regions?.length || regions.includes(state.map.region_id))
  }).map((rule) => {
    const resource = state.resources_meta[rule.resource_id]
    return {
      id: rule.resource_id,
      name: resource?.name ?? rule.resource_id,
      emoji: resource?.emoji ?? '✦',
      imageUrl: resource?.image_url,
      desc: resource?.desc ?? '',
      rarity: resource?.rarity ?? 'common',
    }
  })
})

function terrain(id?: string) { return id ? exploration.state.value?.terrains_meta[id] ?? null : null }
function regionIcon(id: string): { imageUrl: string } {
  const images = {
    frost_crown: '/assets/vendor/game-icons/lorc/snowflake-2.svg',
    broken_spine: '/assets/vendor/game-icons/lorc/mountains.svg',
    moon_vale: '/assets/vendor/game-icons/delapouite/graveyard.svg',
    western_desert: '/assets/vendor/game-icons/delapouite/desert.svg',
    mistwood: '/assets/vendor/game-icons/delapouite/circle-forest.svg',
    emerald_coast: '/assets/vendor/game-icons/delapouite/island.svg',
    amber_steppe: '/assets/vendor/game-icons/delapouite/grass.svg',
    silver_marsh: '/assets/vendor/game-icons/delapouite/swamp.svg',
    ashlands: '/assets/vendor/game-icons/lorc/volcano.svg',
  } as Record<string, string>
  return { imageUrl: images[id] ?? '/assets/vendor/game-icons/delapouite/grass.svg' }
}
function rarityLabel(rarity?: string): string { return ({ common: '常见', uncommon: '少见', rare: '稀有' } as Record<string, string>)[rarity ?? 'common'] ?? '常见' }
function categoryLabel(category?: string): string { return ({ wood: '木材', plant: '植物', mineral: '矿物', creature: '生物素材', aquatic: '水产', arcane: '灵性素材', regional: '地域特产', relic: '遗物' } as Record<string, string>)[category ?? ''] ?? '素材' }
function dropName(type: 'item' | 'material', id: string): string {
  return type === 'material'
    ? exploration.state.value?.resources_meta[id]?.name ?? id
    : catalog.meta.value?.items[id]?.name ?? id
}
function eventStateLabel(state: string): string { return ({ triggered: '新事件', active: '持续事件', expired: '事件结束', action: '行动结果' } as Record<string, string>)[state] ?? '世界事件' }
function eventPhaseLabel(phase: string): string { return ({ triggered: '事件触发', action: '采取行动', expired: '状态变化' } as Record<string, string>)[phase] ?? '事件记录' }
function eventLocationLabel(regionId: string, cellId: number): string {
  const region = exploration.state.value?.world.regions[regionId]?.name ?? regionId
  return `${region} · 地图格 ${cellId}`
}
function eventDateLabel(entry: { year: number; month: number; day: number; hour: number }): string {
  return `公元 ${entry.year} 年 ${entry.month} 月 ${entry.day} 日 ${String(entry.hour).padStart(2, '0')}:00`
}
function cellClass(cell: MapCell): Record<string, boolean> {
  return {
    'map-cell--current': cell.cell_id === exploration.state.value?.map.current_cell_id,
    'map-cell--route': exploration.canMoveTo(cell),
    'map-cell--blocked': !cell.passable,
    'map-cell--resource': cell.gatherable && !cell.gathered,
    'map-cell--settlement': cell.terrain_category === 'settlement',
    'map-cell--gathered': cell.gathered,
    'map-cell--unexplored': !cell.explored,
  }
}
function cellLabel(cell: MapCell): string {
  const name = terrain(cell.terrain_id)?.name ?? '未知地形'
  if (cell.cell_id === exploration.state.value?.map.current_cell_id) return `${name}，当前位置`
  return `${name}${cell.passable ? '' : '，不可通行'}${cell.gatherable ? '，可采集' : ''}${exploration.canMoveTo(cell) ? '，可以前往' : ''}`
}
function directionDisabled(direction: MoveDirection): boolean {
  if (exploration.busy.value || !exploration.state.value || stamina.value <= 0) return true
  const map = exploration.state.value.map
  const current = exploration.currentCell.value
  if (!current) return true
  const delta = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[direction]
  const x = current.x + delta[0]
  const y = current.y + delta[1]
  if (x >= 0 && x < map.width && y >= 0 && y < map.height) return !exploration.state.value.map_grid[y * map.width + x]?.passable
  const worldX = map.world_x + delta[0]
  const worldY = map.world_y + delta[1]
  return worldX < 0 || worldX >= map.world_width || worldY < 0 || worldY >= map.world_height
}
async function enterSelected(refresh: boolean): Promise<void> {
  const template = refresh ? exploration.state.value?.map.template_id : undefined
  const encounter = await exploration.enter(template || undefined, refresh)
  if (encounter) emit('encounter', encounter.npc_id)
}
async function move(cell: MapCell): Promise<void> {
  const encounter = await exploration.moveTo(cell)
  if (encounter) emit('encounter', encounter.npc_id)
}
async function moveDirection(direction: MoveDirection): Promise<void> {
  const encounter = await exploration.moveDirection(direction)
  if (encounter) emit('encounter', encounter.npc_id)
}
async function gather(): Promise<void> {
  const encounter = await exploration.gatherCurrent()
  if (encounter) emit('encounter', encounter.npc_id)
}
function openEncounter(npcId: string): void { emit('encounter', npcId) }
function scrollPlayerIntoView(immediate = false): void {
  const container = mapScroll.value
  const cellId = exploration.state.value?.map.current_cell_id
  if (!container || cellId === undefined) return
  const cell = container.querySelector<HTMLElement>(`[data-cell-id="${cellId}"]`)
  if (!cell) return
  const viewport = container.getBoundingClientRect()
  const bounds = cell.getBoundingClientRect()
  const margin = 16
  const visible = bounds.left >= viewport.left + margin
    && bounds.right <= viewport.right - margin
    && bounds.top >= viewport.top + margin
    && bounds.bottom <= viewport.bottom - margin
  if (visible && !immediate) return
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  container.scrollTo({
    left: container.scrollLeft + bounds.left - viewport.left - (container.clientWidth - bounds.width) / 2,
    top: container.scrollTop + bounds.top - viewport.top - (container.clientHeight - bounds.height) / 2,
    behavior: immediate || reduceMotion ? 'auto' : 'smooth',
  })
}
async function resolveEventAction(actionId: string): Promise<void> {
  const event = exploration.state.value?.event
  if (!event) return
  const response = await exploration.resolveEventAction(event.event_id, actionId)
  if (!response) return
  if (response.combat) {
    await combat.startEncounterBattle(response.combat)
    return
  }
  if (response.interaction.npc_id && ['open_npc', 'start_quest'].includes(response.interaction.type)) {
    emit('encounter', response.interaction.npc_id)
  }
}
function handleKeydown(event: KeyboardEvent): void {
  const target = event.target as HTMLElement | null
  if (target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)) return
  const direction = ({ ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' } as Record<string, MoveDirection>)[event.key]
  if (!direction || directionDisabled(direction)) return
  event.preventDefault()
  void moveDirection(direction)
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  await exploration.loadTemplates()
  if (!exploration.state.value) await enterSelected(false)
})
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>
