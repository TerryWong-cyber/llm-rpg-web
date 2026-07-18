<template>
  <section v-if="profile && race" class="feature-stack growth-feature">
    <header class="character-summary-bar">
      <ItemIcon class="growth-portrait item-icon--portrait" :image-url="race.image_url" :fallback="profile.name.slice(0, 1)" />
      <strong>{{ profile.name }} · {{ race.name }}</strong>
      <span>Lv.{{ profile.level }} · {{ profile.attribute_points }} 可用属性点</span>
    </header>

    <div class="growth-grid">
      <article class="panel progression-card">
        <header><div><p class="eyebrow">EXPERIENCE</p><h3>成长进度</h3></div><b>{{ profile.experience }} / {{ profile.experience_to_next }}</b></header>
        <div class="xp-meter"><i :style="{ width: `${xpPercent}%` }" /></div>
        <p>战斗胜利和完成有明确目标的任务会获得经验。升级需求随等级递增，每次升级获得 5 个属性点。</p>
        <div class="race-ledger">
          <span><small>出生地</small><b>{{ race.birthplace.settlement_name }} · {{ race.nation }}</b></span>
          <span><small>专属技能</small><b>{{ race.exclusive_skills[0]?.name ?? '无' }}</b></span>
          <span><small>种族被动</small><b>{{ race.strengths.join('；') }}</b></span>
          <span><small>种族弱点</small><b>{{ race.weaknesses.join('；') }}</b></span>
        </div>
      </article>

      <article class="panel attribute-card">
        <header><div><p class="eyebrow">ATTRIBUTE POINTS</p><h3>五维加点</h3></div><b>剩余 {{ remainingPoints }}</b></header>
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
      <header><div><p class="eyebrow">CURRENT LOADOUT</p><h3>当前装备</h3></div><small>独行战斗将直接使用此配置</small></header>
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
          <span><small>{{ slot.type === 'weapon' ? '主武器' : '护甲' }}</small><strong>{{ slot.item?.name ?? '未装备' }}</strong><em>{{ slot.item?.desc ?? '请从行囊中选择装备' }}</em></span>
          <button v-if="slot.item" class="button button--ghost" type="button" :disabled="player.busy.value" @click.stop="unequip(slot.type)">卸下</button>
          <button v-else class="button button--ghost" type="button" @click.stop="openInventory">前往行囊</button>
        </section>
      </div>
    </article>

    <article class="panel quest-ledger">
      <header><div><p class="eyebrow">QUEST EXPERIENCE</p><h3>任务与经验</h3></div><b>{{ activeQuests.length }} 项进行中</b></header>
      <div v-if="activeQuests.length" class="quest-list">
        <section v-for="quest in activeQuests" :key="quest.hook_id">
          <div><strong>{{ quest.title }}</strong><p>{{ quest.summary }}</p><small v-for="requirement in quest.requirements" :key="requirement.description">{{ requirementMet(requirement) ? '✓' : '○' }} {{ requirement.description }}</small></div>
          <span><b>+{{ quest.xp_reward }} XP</b><button class="button button--gold" type="button" :disabled="!questReady(quest) || player.busy.value" @click="player.completeQuest(quest.npc_id, quest.hook_id)">提交任务</button></span>
        </section>
      </div>
      <div v-else class="empty-state empty-state--compact"><span>✦</span><h3>尚未接取任务</h3><p>在世界事件或与 NPC 的交流中接受委托后，进度会记录在这里。</p></div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import type { CharacterAttributes, QuestProgress, QuestRequirement } from '../../contracts'
import ItemIcon from '../../components/ui/ItemIcon.vue'
import { useCatalogStore } from '../../stores/catalog'
import { usePlayerStore } from '../../stores/player'
import { useItemTransferStore, type TransferItem } from '../../stores/itemTransfer'

type AttributeId = keyof CharacterAttributes

const player = usePlayerStore()
const catalog = useCatalogStore()
const transfer = useItemTransferStore()
const selectedTransfer = computed(() => transfer.selected.value)
const profile = computed(() => player.profile.value)
const race = computed(() => {
  const id = profile.value?.race_id
  return id ? catalog.meta.value?.races[id] ?? null : null
})
const emit = defineEmits<{ inventory: [] }>()
const equipmentSlots = computed(() => [
  { type: 'weapon' as const, item: profile.value?.equipped_weapon_id ? catalog.meta.value?.weapons[profile.value.equipped_weapon_id] : undefined },
  { type: 'armor' as const, item: profile.value?.equipped_armor_id ? catalog.meta.value?.armors[profile.value.equipped_armor_id] : undefined },
])
const pending = reactive<Record<AttributeId, number>>({ vitality: 0, strength: 0, agility: 0, wisdom: 0, luck: 0 })
const attributes: Array<{ id: AttributeId; label: string; effect: string }> = [
  { id: 'vitality', label: '体质', effect: '提高最大生命与异常抗性' },
  { id: 'strength', label: '力量', effect: '提高物理伤害、生命、精力与物抗' },
  { id: 'agility', label: '敏捷', effect: '提高命中、闪避、暴击与精力' },
  { id: 'wisdom', label: '智慧', effect: '提高法术伤害、法力、法抗与状态抗性' },
  { id: 'luck', label: '幸运', effect: '提高命中、暴击与状态抗性' },
]
const pendingTotal = computed(() => Object.values(pending).reduce((sum, value) => sum + value, 0))
const remainingPoints = computed(() => Math.max(0, (profile.value?.attribute_points ?? 0) - pendingTotal.value))
const xpPercent = computed(() => Math.min(100, (profile.value?.experience ?? 0) / Math.max(1, profile.value?.experience_to_next ?? 1) * 100))
const activeQuests = computed(() => Object.values(profile.value?.active_quests ?? {}))

function change(id: AttributeId, delta: number): void {
  if (delta > 0 && remainingPoints.value <= 0) return
  pending[id] = Math.max(0, pending[id] + delta)
}

async function commitAllocation(): Promise<void> {
  if (pendingTotal.value <= 0) return
  const allocations = Object.fromEntries(Object.entries(pending).filter(([, value]) => value > 0))
  if (await player.allocateAttributes(allocations)) {
    for (const key of Object.keys(pending) as AttributeId[]) pending[key] = 0
  }
}

function requirementMet(requirement: QuestRequirement): boolean {
  const value = profile.value
  if (!value) return false
  if (requirement.kind === 'region') return value.current_map?.region_id === requirement.region_id
  const inventory = requirement.item_type === 'material' ? value.inventory.materials : value.inventory.items
  return (inventory[requirement.item_id ?? ''] ?? 0) >= (requirement.quantity ?? 1)
}

function questReady(quest: QuestProgress): boolean {
  return quest.requirements.every(requirementMet)
}

function openInventory(): void { emit('inventory') }

async function unequip(type: 'weapon' | 'armor'): Promise<void> {
  if (await player.setEquipment(type, null)) transfer.clear()
}

async function placeEquipment(type: 'weapon' | 'armor'): Promise<void> {
  const item = transfer.selected.value
  if (!item || item.type !== type) return
  if (await player.setEquipment(type, item.id)) transfer.clear()
}

function beginEquipmentDrag(type: 'weapon' | 'armor', event: DragEvent): void {
  const slot = equipmentSlots.value.find((entry) => entry.type === type)
  if (!slot?.item) return
  const summary = catalog.itemSummary(type, slot.item.id)
  const item: TransferItem = {
    id: slot.item.id,
    type,
    name: slot.item.name,
    count: 1,
    icon: type === 'weapon' ? '⚔' : '◈',
    imageUrl: slot.item.image_url,
    canBeIngredient: summary?.canBeIngredient ?? false,
    equipped: true,
  }
  transfer.beginDrag(item, event.dataTransfer)
}
</script>
