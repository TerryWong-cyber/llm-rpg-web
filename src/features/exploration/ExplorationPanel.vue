<template>
  <section class="feature-stack exploration-feature">
    <div v-if="exploration.state.value" class="atlas panel">
      <header class="atlas__header">
        <div>
          <p class="eyebrow">THE NINE REALMS · {{ regionName }}</p>
          <h3>16 × 16 地域探索图</h3>
          <small class="atlas__region-summary">世界坐标 {{ exploration.state.value.map.world_x + 1 }}, {{ exploration.state.value.map.world_y + 1 }} · {{ currentRegion?.climate }} · {{ currentRegion?.culture }}</small>
        </div>
        <div class="atlas__status">
          <span class="atlas__time"><b>{{ dayMoment.icon }} {{ dayMoment.label }}</b><small>{{ seasonLabel }} · {{ timeLabel }}</small></span>
          <span class="atlas__stamina"><small>探索精力</small><b>{{ stamina }} / {{ maxStamina }}</b><i><em :style="{ width: `${staminaPercent}%` }" /></i></span>
          <button class="button button--ghost" type="button" @click="showHelp = true">操作与帮助</button>
          <button class="button button--ghost" type="button" @click="emit('world-overview')">九域总览</button>
          <button class="button button--danger-ghost" type="button" :disabled="exploration.busy.value" @click="enterSelected(true)">重置世界</button>
        </div>
      </header>

      <div v-if="exploration.sleeping.value" class="sleeping-banner">
        <span>☾</span>
        <div><strong>睡眠中</strong><small>还需 {{ exploration.sleepRemainingSeconds.value }} 秒 · 完整休息相当于游戏内 6 小时</small></div>
        <button class="button button--danger-ghost" type="button" :disabled="exploration.busy.value" @click="exploration.wake">中断睡眠</button>
      </div>

      <div class="atlas__body">
        <aside class="atlas__event-panel">
          <article v-if="exploration.state.value.encounter" class="encounter-banner">
            <span class="encounter-banner__sigil">✦</span>
            <div><p class="eyebrow">旅途相遇</p><h3>附近有一位值得交谈的人</h3></div>
            <button class="button button--primary" type="button" @click="openEncounter(exploration.state.value.encounter.npc_id)">查看遭遇</button>
          </article>

          <article v-if="exploration.state.value.event" class="world-event" :class="`world-event--${exploration.state.value.event.kind}`">
            <header><span>{{ exploration.state.value.event.emoji }}</span><div><p class="eyebrow">WORLD EVENT · {{ eventStateLabel(exploration.state.value.event.state) }}</p><h3>{{ exploration.state.value.event.title }}</h3></div></header>
            <p>{{ exploration.state.value.event.description }}</p>
            <div v-if="eventParticipant" class="event-participant">
              <ItemIcon class="event-participant__portrait" :image-url="eventParticipant.image_url ?? ''" :fallback="participantFallback" />
              <div class="event-participant__body">
                <small>{{ eventParticipant.type === 'monster' ? `危险等级 ${eventParticipant.combat.threat}` : eventParticipant.race }}</small>
                <strong>{{ eventParticipant.name }} · {{ eventParticipant.title }}</strong>
                <p>{{ eventParticipant.type === 'monster' ? eventParticipant.description : eventParticipant.public_backstory }}</p>
                <div class="event-participant__facts">
                  <template v-if="eventParticipant.type === 'monster'">
                    <span>{{ eventParticipant.rank === 'boss' ? '首领' : eventParticipant.rank === 'elite' ? '精英' : '普通' }} · 生命 {{ eventParticipant.stats.hp }}</span><span>武器 {{ eventParticipant.equipment.weapon_name }}</span><span>护甲 {{ eventParticipant.equipment.armor_name }}</span>
                    <span v-for="drop in eventParticipant.drops" :key="`${drop.item_type}:${drop.item_id}`">掉落 {{ dropName(drop.item_type, drop.item_id) }} · {{ Math.round(drop.chance * 100) }}%</span>
                  </template>
                  <template v-else>
                    <span v-for="hook in eventParticipant.story_hooks" :key="hook.hook_id">任务 · {{ hook.title }}</span>
                    <span v-if="eventParticipant.has_combat_profile">威胁 {{ eventParticipant.combat_threat }}</span>
                  </template>
                </div>
              </div>
            </div>
            <p v-if="exploration.state.value.event.blocks_movement" class="event-forced-warning">道路已被封锁，必须先处理此事件。</p>
            <div v-if="exploration.state.value.event.actions.length" class="world-event__actions">
              <template v-for="action in exploration.state.value.event.actions" :key="action.action_id">
                <div v-if="action.kind === 'use_item' && action.eligible_items.length" class="world-event__item-action">
                  <select v-model="eventItemSelections[action.action_id]" :disabled="exploration.busy.value">
                    <option value="">选择可用物品</option>
                    <option v-for="item in action.eligible_items" :key="item.item_id" :value="item.item_id">{{ item.name }} × {{ item.quantity }}</option>
                  </select>
                  <button class="button button--primary" type="button" :disabled="exploration.busy.value || !eventItemSelections[action.action_id]" @click="resolveEventAction(action.action_id, eventItemSelections[action.action_id])">{{ action.forced ? '必须 · ' : '' }}{{ action.label }}</button>
                </div>
                <div v-else-if="action.kind === 'use_skill' && action.eligible_skills.length" class="world-event__item-action">
                  <select v-model="eventSkillSelections[action.action_id]" :disabled="exploration.busy.value">
                    <option value="">选择可用技能</option>
                    <option v-for="option in action.eligible_skills" :key="option.skill.id" :value="option.skill.id" :disabled="!option.available">{{ option.skill.name }}{{ option.available ? '' : ` · ${option.unavailable_reasons.join('、')}` }}</option>
                  </select>
                  <button class="button button--primary" type="button" :disabled="exploration.busy.value || !eventSkillSelections[action.action_id]" @click="resolveEventAction(action.action_id, undefined, eventSkillSelections[action.action_id])">{{ action.forced ? '必须 · ' : '' }}{{ action.label }}</button>
                </div>
                <button v-else-if="action.kind !== 'use_item' && action.kind !== 'use_skill'" class="button" :class="action.style === 'danger' ? 'button--danger-ghost' : action.style === 'primary' ? 'button--primary' : 'button--ghost'" type="button" :disabled="exploration.busy.value" @click="resolveEventAction(action.action_id)">{{ action.forced ? '必须 · ' : '' }}{{ action.label }}</button>
              </template>
            </div>
          </article>
          <div v-else-if="!exploration.state.value.encounter" class="atlas-side-empty"><span>✦</span><strong>旅途平静</strong><small>当前地图格没有待处理事件</small></div>
        </aside>

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

        <aside class="atlas__action-panel">
          <div class="current-place">
            <ItemIcon class="current-place__icon item-icon--portrait" :image-url="playerAvatarUrl" :fallback="playerInitial" />
            <div><small>你所在的位置</small><strong>{{ terrain(exploration.currentCell.value?.terrain_id)?.name ?? '未知地带' }}</strong><span>{{ terrainDescription }}</span></div>
          </div>

          <section class="map-side-section">
            <p class="eyebrow">AVAILABLE ACTIONS</p>
            <div v-if="hasFieldActions" class="field-actions">
              <button v-if="exploration.gatherAvailable.value" class="button button--primary" type="button" :disabled="exploration.busy.value" @click="gather">{{ exploration.busy.value ? '正在行动…' : `采集 · ${gatherCost} 精力` }}</button>
              <button v-if="exploration.campAvailable.value" class="button button--ghost" type="button" :disabled="exploration.busy.value" @click="exploration.camp">⛺ 扎营休息</button>
              <button v-if="exploration.innAvailable.value" class="button button--gold" type="button" :disabled="exploration.busy.value" @click="exploration.restAtInn">♨ 旅店休整</button>
              <button v-if="exploration.shopAvailable.value" class="button button--gold" type="button" @click="emit('shop')">进入商店</button>
            </div>
            <small v-else class="map-side-muted">当前没有可执行的场景操作</small>
          </section>

          <section class="map-side-section">
            <p class="eyebrow">DISCOVERABLE</p>
            <div v-if="availableResources.length" class="resource-preview">
              <span v-for="resource in availableResources" :key="resource.id" :class="`resource-preview--${resource.rarity}`" :title="resource.desc">
                <img v-if="resource.imageUrl" :src="resource.imageUrl" alt="" /><i v-else>{{ resource.emoji }}</i>{{ resource.name }}<b>{{ rarityLabel(resource.rarity) }}</b>
              </span>
            </div>
            <small v-else class="map-side-muted">当前时段没有可发现物品</small>
          </section>

          <div v-if="exploration.currentCell.value?.tags.length" class="terrain-tags"><span v-for="tag in exploration.currentCell.value.tags" :key="tag"># {{ tag }}</span></div>
        </aside>
      </div>
    </div>

    <div v-else-if="exploration.busy.value" class="empty-state"><span class="spinner" /><h3>世界正在展开</h3><p>地块数量、资源与通路正在根据固定种子生成。</p></div>
    <div v-else class="empty-state"><span>⌖</span><h3>尚未踏上世界地图</h3><p>出生地域由种族与国度决定。</p><button class="button button--primary" type="button" @click="enterSelected(false)">前往出生城镇</button></div>

    <div v-if="showHelp" class="modal-backdrop operation-help-backdrop" @click.self="showHelp = false">
      <section class="modal operation-help" role="dialog" aria-modal="true" aria-labelledby="operation-help-title">
        <header><div><p class="eyebrow">OPERATIONS & TIPS</p><h2 id="operation-help-title">操作与帮助</h2></div><button class="icon-button" type="button" aria-label="关闭操作帮助" @click="showHelp = false">×</button></header>
        <div class="operation-help__grid">
          <article v-for="tip in helpTips" :key="tip.title"><span>{{ tip.icon }}</span><div><strong>{{ tip.title }}</strong><p>{{ tip.description }}</p></div></article>
        </div>
      </section>
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

const emit = defineEmits<{ encounter: [npcId: string]; shop: []; 'world-overview': [] }>()
const exploration = useExplorationStore()
const player = usePlayerStore()
const catalog = useCatalogStore()
const combat = useCombatStore()
const showHelp = ref(false)
const eventItemSelections = ref<Record<string, string>>({})
const eventSkillSelections = ref<Record<string, string>>({})
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

const gridStyle = computed(() => {
  const width = exploration.state.value?.map.width ?? 1
  const height = exploration.state.value?.map.height ?? 1
  return {
    '--map-tile-size': `min(calc((100cqw - .5rem) / ${width}), calc((100cqh - .5rem) / ${height}))`,
    gridTemplateColumns: `repeat(${width}, var(--map-tile-size))`,
  }
})
const currentRegion = computed(() => {
  const id = exploration.state.value?.map.region_id
  return id ? (exploration.state.value?.world.regions[id] ?? exploration.templates.value?.regions[id]) : null
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
const dayMoment = computed(() => {
  const hour = currentTime.value?.hour
  if (hour === undefined) return { label: '同步中', icon: '◌' }
  if (hour < 5) return { label: '深夜', icon: '☾' }
  if (hour < 7) return { label: '黎明', icon: '◒' }
  if (hour < 11) return { label: '上午', icon: '☀' }
  if (hour < 14) return { label: '中午', icon: '◉' }
  if (hour < 18) return { label: '下午', icon: '☀' }
  if (hour < 20) return { label: '傍晚', icon: '◐' }
  return { label: '夜晚', icon: '☾' }
})
const timeLabel = computed(() => {
  const time = currentTime.value
  return time ? `${time.month} 月 ${time.day} 日 · ${String(time.hour).padStart(2, '0')}:00` : '时间同步中'
})
const hasFieldActions = computed(() => Boolean(
  exploration.gatherAvailable.value
  || exploration.campAvailable.value
  || exploration.innAvailable.value
  || exploration.shopAvailable.value,
))
const gatherCost = computed(() => exploration.state.value?.actions.gather.cost ?? 0)
const regionName = computed(() => currentRegion.value?.name ?? exploration.state.value?.map.region_id ?? 'UNCHARTED REGION')
const terrainDescription = computed(() => {
  const cell = exploration.currentCell.value
  const meta = currentTerrain.value
  if (!cell || !meta) return '未记录地块'
  const labels = { ordinary: '普通地块', resource: '资源地块', settlement: '聚落地块', interactive: '交互地块', blocked: '阻挡地块' }
  return `${labels[cell.terrain_category]} · 移动消耗 ${cell.movement_cost} 精力${cell.landmark_id ? ` · ${cell.landmark_id}` : ''}`
})
const eventParticipant = computed(() => exploration.state.value?.event?.participant ?? null)
const participantFallback = computed(() => {
  const participant = eventParticipant.value
  return participant?.type === 'monster' ? participant.emoji : participant?.name.slice(0, 1) ?? '？'
})
const helpTips = [
  { icon: '⌨', title: '移动', description: '聚焦地图后使用方向键或 WASD；也可以直接点击相邻且可通行的地图格。' },
  { icon: '◇', title: '行囊与食物', description: '食物、药剂和工具都从旅人行囊使用；悬停一秒或点击物品格可查看效果。' },
  { icon: '⚔', title: '装备与战斗', description: '在角色页面或行囊中装备武器与护甲。PVE 会直接使用当前装备。' },
  { icon: '✦', title: '事件交互', description: '部分事件可以使用带有匹配类别与能力标签的物品解决，服务器会最终判定。' },
  { icon: '☀', title: '时间与环境', description: '昼夜和季节会影响商店、资源、事件与地图氛围；旅店和扎营可以恢复状态。' },
  { icon: '⌖', title: '跨越地域', description: '到达 16×16 地图边缘后继续移动，即可进入九域总览中的相邻地域。' },
]
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
function rarityLabel(rarity?: string): string { return ({ common: '常见', uncommon: '少见', rare: '稀有' } as Record<string, string>)[rarity ?? 'common'] ?? '常见' }
function dropName(type: 'item' | 'material', id: string): string {
  return type === 'material'
    ? exploration.state.value?.resources_meta[id]?.name ?? id
    : catalog.meta.value?.items[id]?.name ?? id
}
function eventStateLabel(state: string): string { return ({ triggered: '新事件', active: '持续事件', expired: '事件结束', action: '行动结果' } as Record<string, string>)[state] ?? '世界事件' }
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
async function resolveEventAction(actionId: string, itemId?: string, skillId?: string): Promise<void> {
  const event = exploration.state.value?.event
  if (!event) return
  const response = await exploration.resolveEventAction(event.event_id, actionId, itemId, skillId)
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
