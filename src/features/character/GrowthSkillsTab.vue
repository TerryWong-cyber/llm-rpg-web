<template>
  <section class="growth-tab-stack skill-workbench">
    <article class="panel skill-slot-panel">
      <header><div><p class="eyebrow">COMBAT LOADOUT</p><h3>战斗技能槽</h3></div><small>{{ saveStateLabel }}</small></header>
      <p class="skill-drag-hint">将技能拖入槽位即可装配；槽位之间拖动可交换，拖出技能栏即自动卸下。</p>
      <div class="skill-loadout skill-loadout--draggable">
        <button
          v-for="slotIndex in 5"
          :key="slotIndex"
          type="button"
          :class="{ filled: slots[slotIndex - 1], 'drop-target-active': dragState && dragOverSlot === slotIndex - 1 }"
          :draggable="Boolean(slots[slotIndex - 1]) && !saving"
          @dragstart="beginSlotDrag(slotIndex - 1, $event)"
          @dragend="finishSlotDrag"
          @dragenter.prevent="dragOverSlot = slotIndex - 1"
          @dragover.prevent
          @dragleave="dragOverSlot = null"
          @drop.prevent="dropOnSlot(slotIndex - 1)"
          @click="slots[slotIndex - 1] && removeByClick(slotIndex - 1)"
        >
          <template v-if="slots[slotIndex - 1]">
            <ItemIcon :image-url="skillById(slots[slotIndex - 1])?.icon_url" fallback="✦" />
            <span>{{ skillById(slots[slotIndex - 1])?.name }}</span><small>拖走卸下</small>
          </template>
          <template v-else><b>{{ slotIndex }}</b><span>空技能槽</span><small>拖入技能</small></template>
        </button>
      </div>
    </article>

    <article v-if="activeEffects.length" class="panel active-skill-effects">
      <header><div><p class="eyebrow">ACTIVE EFFECTS</p><h3>持续中的探索状态</h3></div></header>
      <span v-for="effect in activeEffects" :key="effect.state_id"><b>{{ effect.name }}</b> · 剩余 {{ remainingSeconds(effect.expires_at) }} 秒</span>
    </article>

    <article class="panel skill-library" @dragover.prevent @drop.prevent="dropToLibrary">
      <header><div><p class="eyebrow">SKILL GRIMOIRE</p><h3>已习得技能</h3></div><small>{{ learnedSkills.length }} 项能力</small></header>
      <div class="learned-skill-grid">
        <article
          v-for="skill in learnedSkills"
          :key="skill.id"
          class="learned-skill-card"
          :class="{ selected: selectedSkillId === skill.id, equipped: slots.includes(skill.id) }"
          :draggable="skill.use_contexts?.includes('combat') && !saving"
          @dragstart="beginLibraryDrag(skill.id, $event)"
          @dragend="finishLibraryDrag"
        >
          <button type="button" class="learned-skill-card__summary" @click="selectedSkillId = selectedSkillId === skill.id ? '' : skill.id">
            <ItemIcon :image-url="skill.icon_url" fallback="✦" />
            <span><small>{{ skillTypeLabel(skill.type) }} · {{ skill.rarity ?? 'common' }}</small><strong>{{ skill.name }}</strong><em>{{ skill.description }}</em></span>
            <b>{{ costLabel(skill) }}</b>
          </button>
          <div v-if="selectedSkillId === skill.id" class="learned-skill-card__details">
            <p>{{ effectSummary(skill) }}</p>
            <p><b>范围：</b>{{ rangeLabel(skill.effect_range) }}　<b>学习条件：</b>{{ conditionLabel(skill) }}</p>
            <div class="tag-list"><span v-for="tag in skill.tags ?? []" :key="tag">{{ tag }}</span></div>
            <button v-if="skill.use_contexts?.includes('combat')" class="button button--ghost" type="button" :disabled="saving || (!slots.includes(skill.id) && slots.length >= 5)" @click="toggleByClick(skill.id)">{{ slots.includes(skill.id) ? '卸下战斗技能' : '装配到空槽' }}</button>
            <button v-if="skill.use_contexts?.includes('exploration')" class="button button--gold" type="button" :disabled="player.busy.value" @click="player.castExplorationSkill(skill.id)">在探索中释放</button>
          </div>
        </article>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { PlayerProfile, SkillDefinition } from '../../contracts'
import ItemIcon from '../../components/ui/ItemIcon.vue'
import { useCatalogStore } from '../../stores/catalog'
import { usePlayerStore } from '../../stores/player'

type SkillDrag = { source: 'library' | 'slot'; skillId: string; slotIndex?: number }
const props = defineProps<{ profile: PlayerProfile }>()
const player = usePlayerStore()
const catalog = useCatalogStore()
const slots = ref<string[]>([])
const selectedSkillId = ref('')
const dragState = ref<SkillDrag | null>(null)
const dragOverSlot = ref<number | null>(null)
const handledDrop = ref(false)
const saving = ref(false)
const saveFailed = ref(false)
const clockNow = ref(Date.now())
let skillClock: number | undefined

const learnedSkills = computed(() => Object.keys(props.profile.learned_skills ?? {}).flatMap((id) => { const skill = catalog.meta.value?.skills[id]; return skill ? [skill] : [] }))
const activeEffects = computed(() => (props.profile.exploration_effects ?? []).filter((effect) => remainingSeconds(effect.expires_at) > 0))
const saveStateLabel = computed(() => saving.value ? '正在自动保存…' : saveFailed.value ? '保存失败，已恢复原配置' : '拖放后自动保存')
watch(() => props.profile.equipped_skill_ids, (ids) => { if (!saving.value) slots.value = [...(ids ?? [])] }, { immediate: true })

function skillById(id?: string): SkillDefinition | undefined { return id ? catalog.meta.value?.skills[id] : undefined }
function beginLibraryDrag(skillId: string, event: DragEvent): void { dragState.value = { source: 'library', skillId }; handledDrop.value = false; event.dataTransfer?.setData('text/plain', `skill:${skillId}`); if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move' }
function beginSlotDrag(index: number, event: DragEvent): void { const skillId = slots.value[index]; if (!skillId) return; dragState.value = { source: 'slot', skillId, slotIndex: index }; handledDrop.value = false; event.dataTransfer?.setData('text/plain', `skill:${skillId}`); if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move' }
function finishLibraryDrag(): void { dragState.value = null; dragOverSlot.value = null }
function finishSlotDrag(): void { const drag = dragState.value; if (drag?.source === 'slot' && !handledDrop.value && drag.slotIndex !== undefined) void persist(slots.value.filter((_, index) => index !== drag.slotIndex)); dragState.value = null; dragOverSlot.value = null }
function dropOnSlot(targetIndex: number): void {
  const drag = dragState.value
  if (!drag || saving.value) return
  handledDrop.value = true
  const next = [...slots.value]
  if (drag.source === 'slot' && drag.slotIndex !== undefined) {
    if (drag.slotIndex === targetIndex) return
    const target = next[targetIndex]
    next[targetIndex] = drag.skillId
    if (target) next[drag.slotIndex] = target
    else next.splice(drag.slotIndex, 1)
  } else {
    const existing = next.indexOf(drag.skillId)
    if (existing >= 0) {
      const target = next[targetIndex]
      next[targetIndex] = drag.skillId
      if (target) next[existing] = target
      else next.splice(existing, 1)
    } else if (targetIndex < next.length) next[targetIndex] = drag.skillId
    else if (next.length < 5) next.push(drag.skillId)
  }
  void persist(next.filter(Boolean).slice(0, 5))
}
function dropToLibrary(): void { const drag = dragState.value; if (drag?.source !== 'slot' || drag.slotIndex === undefined || saving.value) return; handledDrop.value = true; void persist(slots.value.filter((_, index) => index !== drag.slotIndex)) }
function removeByClick(index: number): void { if (!saving.value) void persist(slots.value.filter((_, current) => current !== index)) }
function toggleByClick(skillId: string): void { const index = slots.value.indexOf(skillId); if (index >= 0) removeByClick(index); else if (slots.value.length < 5 && !saving.value) void persist([...slots.value, skillId]) }
async function persist(next: string[]): Promise<void> {
  if (saving.value || JSON.stringify(next) === JSON.stringify(slots.value)) return
  const previous = [...slots.value]
  slots.value = [...next]
  saving.value = true
  saveFailed.value = false
  const saved = await player.equipSkills(next, false)
  if (!saved) { slots.value = previous; saveFailed.value = true }
  else slots.value = [...(player.profile.value?.equipped_skill_ids ?? next)]
  saving.value = false
}
function remainingSeconds(expiresAt: string): number { return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - clockNow.value) / 1000)) }
function skillTypeLabel(type?: SkillDefinition['type']): string { return ({ damage: '伤害', defense: '防御', healing: '回复', buff: '增益', control: '控制', utility: '探索', passive: '被动' } as Record<string, string>)[type ?? 'utility'] ?? '技能' }
function rangeLabel(range?: SkillDefinition['effect_range']): string { return ({ self: '自身', single: '单体', area: '区域', all_enemies: '全体敌人', event: '事件目标' } as Record<string, string>)[range ?? 'single'] ?? '单体' }
function costLabel(skill: SkillDefinition): string { const entries = Object.entries(skill.costs ?? {}); return entries.length ? entries.map(([key, value]) => `${key === 'mp' ? '法力' : key.toUpperCase()} ${value}`).join(' · ') : '无消耗' }
function conditionLabel(skill: SkillDefinition): string { const condition = skill.learning_conditions; if (!condition) return '无'; const parts = [condition.minimum_level > 1 ? `等级 ${condition.minimum_level}` : '', ...Object.entries(condition.minimum_attributes ?? {}).map(([key, value]) => `${key} ${value}`)].filter(Boolean); return parts.join('、') || '无' }
function effectSummary(skill: SkillDefinition): string { return (skill.effects ?? []).map((effect) => { if (effect.kind === 'damage') return `${effect.damage_type === 'elemental' ? effect.element : effect.damage_type}伤害：固定 ${effect.fixed_amount}${Object.keys(effect.attribute_scaling ?? {}).length ? ` + ${Object.entries(effect.attribute_scaling).map(([key, value]) => `${key}×${value}`).join(' + ')}` : ''}`; if (effect.kind === 'heal') return `回复 ${effect.fixed_amount} 点生命并获得属性加成`; if (effect.kind === 'apply_status') return `施加 ${effect.status_id}（${Math.round(effect.chance * 100)}%）`; if (effect.kind === 'grant_exploration_state') return `获得 ${effect.state_id} 状态 ${effect.duration_seconds} 秒`; return effect.kind }).join('；') }
onMounted(() => { skillClock = window.setInterval(() => { clockNow.value = Date.now() }, 1000) })
onUnmounted(() => { if (skillClock !== undefined) window.clearInterval(skillClock) })
</script>
