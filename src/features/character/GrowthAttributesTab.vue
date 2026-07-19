<template>
  <section class="growth-tab-stack">
    <div class="growth-overview-grid">
      <article class="panel progression-card">
        <header><div><p class="eyebrow">LEVEL & EXPERIENCE</p><h3>成长进度</h3></div><b>Lv.{{ profile.level }}</b></header>
        <div class="level-experience"><strong>{{ profile.experience }} / {{ profile.experience_to_next }} XP</strong><span>累计 {{ profile.total_experience }} XP</span></div>
        <div class="xp-meter"><i :style="{ width: `${xpPercent}%` }" /></div>
        <div class="resource-ledger">
          <span><small>生命</small><b>{{ profile.current_hp }} / {{ profile.max_hp }}</b></span>
          <span><small>法力</small><b>{{ profile.current_mp }} / {{ profile.max_mp }}</b></span>
          <span><small>精力</small><b>{{ profile.stamina }} / {{ profile.max_stamina }}</b></span>
          <span><small>可用属性点</small><b>{{ profile.attribute_points }}</b></span>
        </div>
        <div class="race-ledger">
          <span><small>种族与国度</small><b>{{ race.name }} · {{ race.nation }}</b></span>
          <span><small>出生地</small><b>{{ race.birthplace.settlement_name }}</b></span>
          <span><small>种族优势</small><b>{{ race.strengths.join('；') }}</b></span>
          <span><small>种族弱点</small><b>{{ race.weaknesses.join('；') }}</b></span>
        </div>
      </article>

      <article class="panel attribute-card">
        <header><div><p class="eyebrow">ATTRIBUTE POINTS</p><h3>五维属性</h3></div><b>剩余 {{ remainingPoints }}</b></header>
        <div class="attribute-list">
          <div v-for="attribute in attributes" :key="attribute.id">
            <span><strong>{{ attribute.label }}</strong><small>{{ attribute.effect }}</small></span>
            <b>{{ profile.attributes[attribute.id] }}<i v-if="pending[attribute.id]"> +{{ pending[attribute.id] }}</i></b>
            <span class="attribute-controls">
              <button type="button" :disabled="!pending[attribute.id]" @click="change(attribute.id, -1)">−</button>
              <button type="button" :disabled="remainingPoints <= 0" @click="change(attribute.id, 1)">＋</button>
            </span>
          </div>
        </div>
        <button class="button button--primary" type="button" :disabled="pendingTotal <= 0 || player.busy.value" @click="commitAllocation">
          {{ player.busy.value ? '正在记录…' : `确认分配 ${pendingTotal} 点` }}
        </button>
      </article>
    </div>

    <article class="panel equipment-panel">
      <header><div><p class="eyebrow">CURRENT LOADOUT</p><h3>武器与护甲</h3></div><small>可与行囊直接拖放换装</small></header>
      <div class="equipment-slots">
        <section
          v-for="slot in equipmentSlots"
          :key="slot.type"
          class="equipment-dropzone"
          :class="{ 'drop-target-active': selectedTransfer?.type === slot.type }"
          :draggable="Boolean(slot.item)"
          @click="placeEquipment(slot.type)"
          @dragover.prevent
          @drop.prevent="placeEquipment(slot.type)"
          @dragstart="beginEquipmentDrag(slot.type, $event)"
          @dragend="transfer.endDrag"
        >
          <ItemIcon class="equipment-slot__icon" :image-url="slot.item?.image_url" :fallback="slot.type === 'weapon' ? '⚔' : '◈'" />
          <span><small>{{ slot.type === 'weapon' ? '主武器' : '护甲' }}</small><strong>{{ slot.item?.name ?? '未装备' }}</strong><em>{{ equipmentDetail(slot.item) }}</em></span>
          <button v-if="slot.item" class="button button--ghost" type="button" :disabled="player.busy.value" @click.stop="unequip(slot.type)">卸下</button>
          <button v-else class="button button--ghost" type="button" @click.stop="emit('inventory')">前往行囊</button>
        </section>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import type { CharacterAttributes, PlayerProfile, RaceDefinition } from '../../contracts'
import ItemIcon from '../../components/ui/ItemIcon.vue'
import { useCatalogStore } from '../../stores/catalog'
import { useItemTransferStore, type TransferItem } from '../../stores/itemTransfer'
import { usePlayerStore } from '../../stores/player'

type AttributeId = keyof CharacterAttributes
const props = defineProps<{ profile: PlayerProfile; race: RaceDefinition }>()
const emit = defineEmits<{ inventory: [] }>()
const player = usePlayerStore()
const catalog = useCatalogStore()
const transfer = useItemTransferStore()
const selectedTransfer = computed(() => transfer.selected.value)
const pending = reactive<Record<AttributeId, number>>({ vitality: 0, strength: 0, agility: 0, wisdom: 0, luck: 0 })
const attributes: Array<{ id: AttributeId; label: string; effect: string }> = [
  { id: 'vitality', label: '体质', effect: '最大生命、异常抗性' },
  { id: 'strength', label: '力量', effect: '物理伤害、生命、物理防御' },
  { id: 'agility', label: '敏捷', effect: '命中、闪避与暴击' },
  { id: 'wisdom', label: '智慧', effect: '法术伤害、最大法力与法术防御' },
  { id: 'luck', label: '幸运', effect: '命中、暴击与状态抗性' },
]
const pendingTotal = computed(() => Object.values(pending).reduce((sum, value) => sum + value, 0))
const remainingPoints = computed(() => Math.max(0, props.profile.attribute_points - pendingTotal.value))
const xpPercent = computed(() => Math.min(100, props.profile.experience / Math.max(1, props.profile.experience_to_next) * 100))
const equipmentSlots = computed(() => [
  { type: 'weapon' as const, item: props.profile.equipped_weapon_id ? catalog.meta.value?.weapons[props.profile.equipped_weapon_id] : undefined },
  { type: 'armor' as const, item: props.profile.equipped_armor_id ? catalog.meta.value?.armors[props.profile.equipped_armor_id] : undefined },
])

function change(id: AttributeId, delta: number): void { if (delta > 0 && remainingPoints.value <= 0) return; pending[id] = Math.max(0, pending[id] + delta) }
async function commitAllocation(): Promise<void> {
  const allocations = Object.fromEntries(Object.entries(pending).filter(([, value]) => value > 0))
  if (pendingTotal.value > 0 && await player.allocateAttributes(allocations)) for (const key of Object.keys(pending) as AttributeId[]) pending[key] = 0
}
async function unequip(type: 'weapon' | 'armor'): Promise<void> { if (await player.setEquipment(type, null)) transfer.clear() }
async function placeEquipment(type: 'weapon' | 'armor'): Promise<void> { const item = transfer.selected.value; if (item?.type === type && await player.setEquipment(type, item.id)) transfer.clear() }
function beginEquipmentDrag(type: 'weapon' | 'armor', event: DragEvent): void {
  const slot = equipmentSlots.value.find((entry) => entry.type === type)
  if (!slot?.item) return
  const summary = catalog.itemSummary(type, slot.item.id)
  const item: TransferItem = { id: slot.item.id, type, name: slot.item.name, count: 1, icon: type === 'weapon' ? '⚔' : '◈', imageUrl: slot.item.image_url, canBeIngredient: summary?.canBeIngredient ?? false, equipped: true }
  transfer.beginDrag(item, event.dataTransfer)
}
function equipmentDetail(item: { desc?: string; base_dmg?: number; def?: number } | undefined): string { if (!item) return '请从行囊中选择装备'; return `${item.desc ?? ''}${item.base_dmg ? ` · 伤害 ${item.base_dmg}` : ''}${item.def ? ` · 防御 ${item.def}` : ''}` }
</script>
