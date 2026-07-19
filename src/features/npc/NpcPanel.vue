<template>
  <section class="feature-stack npc-feature journal-feature">
    <nav class="segmented journal-tabs" aria-label="旅途日志分类">
      <button v-for="item in tabs" :key="item.id" type="button" :class="{ active: activeTab === item.id }" @click="activeTab = item.id">
        {{ item.label }} <span>{{ item.count }}</span>
      </button>
    </nav>

    <section v-if="activeTab === 'events'" class="journal-timeline panel">
      <article v-for="entry in world.journal.value?.events ?? []" :key="entry.log_id" class="timeline-entry">
        <span class="timeline-entry__mark">{{ entry.emoji }}</span>
        <div>
          <small>{{ eventPhase(entry.phase) }} · {{ entry.year }}年{{ entry.month }}月{{ entry.day }}日 {{ String(entry.hour).padStart(2, '0') }}:00</small>
          <h3>{{ entry.title }}</h3><p>{{ entry.description }}</p>
          <em>{{ regionName(entry.region_id) }} · 地块 {{ entry.cell_id }}</em>
        </div>
      </article>
      <div v-if="!world.journal.value?.events.length" class="empty-state"><span>◇</span><h3>时间线上尚无记录</h3><p>探索、世界事件及你的选择会依次写入这里。</p></div>
    </section>

    <section v-else-if="activeTab === 'quests'" class="quest-journal">
      <div class="quest-journal__column">
        <header><p class="eyebrow">ACTIVE QUESTS</p><h3>进行中</h3></header>
        <article v-for="quest in world.journal.value?.active_quests ?? []" :key="quest.hook_id" class="journal-quest panel">
          <header><div><h3>{{ quest.title }}</h3><p>{{ quest.summary }}</p><small v-if="quest.skill_rewards?.length">技能奖励 · {{ quest.skill_rewards.map(skillName).join('、') }}</small></div><b>+{{ quest.xp_reward }} XP</b></header>
          <div class="quest-related" v-if="quest.related_npcs?.length"><small>相关人物</small><span v-for="npc in quest.related_npcs" :key="npc.npc_id">{{ npc.name }}</span></div>
          <ul><li v-for="requirement in quest.requirements" :key="requirement.description" :class="{ done: requirement.completed }"><b>{{ requirement.completed ? '✓' : '○' }}</b><span>{{ requirement.description }}</span><small v-if="requirement.kind === 'inventory'">{{ requirement.current ?? 0 }} / {{ requirement.quantity ?? 1 }}</small></li></ul>
          <button class="button button--gold" type="button" :disabled="!quest.requirements.every((item) => item.completed) || player.busy.value" @click="completeQuest(quest.npc_id, quest.hook_id)">提交任务</button>
        </article>
        <div v-if="!world.journal.value?.active_quests.length" class="empty-state empty-state--compact"><span>✦</span><p>尚无进行中的关键任务。</p></div>
      </div>
      <div class="quest-journal__column">
        <header><p class="eyebrow">COMPLETED QUESTS</p><h3>已完成</h3></header>
        <article v-for="quest in world.journal.value?.completed_quests ?? []" :key="quest.hook_id" class="journal-quest journal-quest--complete panel">
          <header><div><h3>{{ quest.title }}</h3><p>{{ quest.summary }}</p></div><b>已完成</b></header>
          <div class="quest-related" v-if="quest.related_npcs?.length"><small>相关人物</small><span v-for="npc in quest.related_npcs" :key="npc.npc_id">{{ npc.name }}</span></div>
        </article>
        <div v-if="!world.journal.value?.completed_quests.length" class="empty-state empty-state--compact"><span>◇</span><p>尚无完成的任务。</p></div>
      </div>
    </section>

    <section v-else class="npc-layout">
      <aside class="npc-roster panel">
        <p class="eyebrow">ENCOUNTERED</p>
        <button v-for="npc in world.npcs.value" :key="npc.npc_id" class="npc-roster__entry" :class="{ active: world.selectedNpc.value?.npc_id === npc.npc_id }" type="button" @click="world.selectNpc(npc.npc_id)">
          <span class="npc-avatar">{{ initials(npc.name) }}</span><span><strong>{{ npc.name }}</strong><small>{{ npc.title || npc.race }}</small></span><b v-if="npc.has_combat_profile">⚔</b>
        </button>
        <div v-if="!world.npcs.value.length && !world.busy.value" class="empty-state empty-state--compact"><span>◇</span><p>尚未遇见任何人物。</p></div>
      </aside>

      <div v-if="world.selectedNpc.value" class="npc-main">
        <article class="npc-profile panel">
          <div class="npc-profile__portrait"><span>{{ initials(world.selectedNpc.value.name) }}</span><small>{{ world.selectedNpc.value.race }}</small></div>
          <div class="npc-profile__copy"><p class="eyebrow">{{ world.selectedNpc.value.location.region }} · {{ world.selectedNpc.value.location.landmark }}</p><h2>{{ world.selectedNpc.value.name }}</h2><h3>{{ world.selectedNpc.value.title }}</h3><p>{{ world.selectedNpc.value.public_backstory }}</p><div class="tag-list"><span v-for="trait in world.selectedNpc.value.personality" :key="trait">{{ trait }}</span></div></div>
        </article>
        <div v-if="world.relationship.value" class="relationship-grid"><div><span>亲和</span><strong>{{ world.relationship.value.affinity }}</strong></div><div><span>信任</span><strong>{{ world.relationship.value.trust }}</strong></div><div><span>敬意</span><strong>{{ world.relationship.value.respect }}</strong></div><div class="hostile"><span>敌意</span><strong>{{ world.relationship.value.hostility }}</strong></div></div>
        <article v-if="trainerOffers.length" class="panel trainer-panel">
          <header><div><p class="eyebrow">SKILL MENTOR</p><h3>导师传授</h3></div><small>金币与学习条件均由服务器校验</small></header>
          <div class="trainer-offers">
            <section v-for="offer in trainerOffers" :key="offer.skill.id">
              <ItemIcon :image-url="offer.skill.icon_url" fallback="✦" />
              <span><strong>{{ offer.skill.name }}</strong><small>{{ offer.skill.description }}</small><em v-if="offer.unavailable_reasons.length">{{ offer.unavailable_reasons.join('；') }}</em></span>
              <button class="button button--gold" type="button" :disabled="offer.learned || !offer.available || player.busy.value" @click="learnFromTrainer(offer.skill.id)">{{ offer.learned ? '已习得' : `${offer.gold_cost} 金币` }}</button>
            </section>
          </div>
        </article>
        <div class="dialogue-layout">
          <section class="dialogue panel">
            <div class="dialogue__log" aria-live="polite"><div v-if="!world.dialogueLog.value.length" class="dialogue__opening"><p>“{{ world.selectedNpc.value.conversation_style }}”</p><small>你们尚无聊天记录。</small></div><article v-for="(line, index) in world.dialogueLog.value" :key="index" class="dialogue-line" :class="`dialogue-line--${line.role}`"><small>{{ line.role === 'player' ? '你' : world.selectedNpc.value.name }}<template v-if="line.tone"> · {{ line.tone }}</template></small><p>{{ line.text }}</p></article></div>
            <form class="dialogue__form" @submit.prevent="send"><textarea v-model="message" maxlength="500" rows="2" placeholder="写下你想说的话…" /><button class="button button--primary" type="submit" :disabled="world.busy.value || !message.trim()">{{ world.busy.value ? '等待回应…' : '交谈' }}</button></form>
          </section>
          <aside class="npc-notes"><article class="panel"><p class="eyebrow">SHARED MEMORIES</p><ul v-if="world.memories.value.length" class="memory-list"><li v-for="memory in world.memories.value" :key="memory.memory_id">{{ memory.summary }}</li></ul><p v-else class="muted">你们尚无共同记忆。</p></article></aside>
        </div>
        <article v-if="world.combatTrigger.value" class="combat-invitation"><div><p class="eyebrow">COMBAT TRIGGER ARMED</p><h3>⚔ {{ world.combatTrigger.value.title }}</h3><p>{{ world.combatTrigger.value.intro }}</p></div><button class="button button--danger" type="button" :disabled="world.busy.value" @click="beginBattle">接受战斗</button></article>
      </div>
      <div v-else class="empty-state panel"><span v-if="world.busy.value" class="spinner" /><span v-else>◇</span><h3>{{ world.busy.value ? '人物档案正在展开' : '选择一位人物' }}</h3></div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import * as gameApi from '../../api/game'
import type { TrainerSkillOffer } from '../../contracts'
import ItemIcon from '../../components/ui/ItemIcon.vue'
import { useCombatStore } from '../../stores/combat'
import { useCatalogStore } from '../../stores/catalog'
import { useExplorationStore } from '../../stores/exploration'
import { usePlayerStore } from '../../stores/player'
import { useWorldStore } from '../../stores/world'

type JournalTab = 'events' | 'quests' | 'people'
const world = useWorldStore()
const player = usePlayerStore()
const combat = useCombatStore()
const catalog = useCatalogStore()
const exploration = useExplorationStore()
const activeTab = ref<JournalTab>('events')
const message = ref('')
const trainerOffers = ref<TrainerSkillOffer[]>([])
const tabs = computed(() => [
  { id: 'events' as const, label: '事件', count: world.journal.value?.events.length ?? 0 },
  { id: 'quests' as const, label: '任务', count: world.journal.value?.active_quests.length ?? 0 },
  { id: 'people' as const, label: '人物', count: world.journal.value?.contacts.length ?? 0 },
])

function initials(name: string): string { return name.trim().slice(0, 2) || '？' }
function eventPhase(phase: string): string { return ({ triggered: '事件发生', action: '采取行动', expired: '事件结束' } as Record<string, string>)[phase] ?? '事件记录' }
function regionName(id: string): string { return exploration.state.value?.world.regions[id]?.name ?? id }
function skillName(id: string): string { return catalog.meta.value?.skills[id]?.name ?? id }
async function send(): Promise<void> { const text = message.value.trim(); if (!text) return; message.value = ''; await world.talk(text) }
async function beginBattle(): Promise<void> { const response = await world.beginCombat(); if (response) await combat.startNpcBattle(response) }
async function completeQuest(npcId: string, hookId: string): Promise<void> { if (await player.completeQuest(npcId, hookId)) await world.loadWorld() }
async function loadTrainer(npcId?: string): Promise<void> {
  if (!npcId || !player.playerId.value) { trainerOffers.value = []; return }
  try { trainerOffers.value = (await gameApi.getTrainerSkills(player.playerId.value, npcId)).offers }
  catch { trainerOffers.value = [] }
}
async function learnFromTrainer(skillId: string): Promise<void> {
  const npcId = world.selectedNpc.value?.npc_id
  if (npcId && await player.learnTrainerSkill(npcId, skillId)) await loadTrainer(npcId)
}

watch(() => world.selectedNpc.value?.npc_id, (npcId) => { void loadTrainer(npcId) })

onMounted(async () => {
  await world.loadWorld()
  if (!world.selectedNpc.value && world.npcs.value.length) await world.selectNpc(world.npcs.value[0].npc_id)
})
</script>
