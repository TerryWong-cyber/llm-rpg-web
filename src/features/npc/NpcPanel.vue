<template>
  <section class="feature-stack npc-feature">
    <div class="feature-toolbar">
      <small>追踪人物、任务线与世界事件</small>
      <span class="world-memory">世界记忆 {{ world.worldFacts.value.length }} 条</span>
    </div>

    <div class="npc-layout">
      <aside class="npc-roster panel">
        <p class="eyebrow">KNOWN SOULS</p>
        <button
          v-for="npc in world.npcs.value"
          :key="npc.npc_id"
          class="npc-roster__entry"
          :class="{ active: world.selectedNpc.value?.npc_id === npc.npc_id }"
          type="button"
          @click="world.selectNpc(npc.npc_id)"
        >
          <span class="npc-avatar">{{ initials(npc.name) }}</span>
          <span><strong>{{ npc.name }}</strong><small>{{ npc.title || npc.race }}</small></span>
          <b v-if="npc.has_combat_profile" title="此人物拥有战斗档案">⚔</b>
        </button>
        <div v-if="!world.npcs.value.length && !world.busy.value" class="empty-state empty-state--compact"><span>◇</span><p>尚未遇见任何人物。</p></div>
      </aside>

      <div v-if="world.selectedNpc.value" class="npc-main">
        <article class="npc-profile panel">
          <div class="npc-profile__portrait"><span>{{ initials(world.selectedNpc.value.name) }}</span><small>{{ world.selectedNpc.value.race }}</small></div>
          <div class="npc-profile__copy">
            <p class="eyebrow">{{ world.selectedNpc.value.location.region }} · {{ world.selectedNpc.value.location.landmark }}</p>
            <h2>{{ world.selectedNpc.value.name }}</h2>
            <h3>{{ world.selectedNpc.value.title }}</h3>
            <p>{{ world.selectedNpc.value.appearance }}</p>
            <div class="tag-list"><span v-for="trait in world.selectedNpc.value.personality" :key="trait">{{ trait }}</span></div>
          </div>
          <div v-if="world.selectedNpc.value.combat_threat !== null" class="threat-seal"><small>威胁</small><strong>{{ world.selectedNpc.value.combat_threat }}</strong></div>
        </article>

        <div v-if="world.relationship.value" class="relationship-grid">
          <div><span>亲和</span><strong>{{ world.relationship.value.affinity }}</strong></div>
          <div><span>信任</span><strong>{{ world.relationship.value.trust }}</strong></div>
          <div><span>敬意</span><strong>{{ world.relationship.value.respect }}</strong></div>
          <div class="hostile"><span>敌意</span><strong>{{ world.relationship.value.hostility }}</strong></div>
        </div>

        <article v-if="world.activatedStoryHook.value" class="story-hook">
          <span>✦</span><div><p class="eyebrow">STORY AWAKENED</p><h3>{{ world.activatedStoryHook.value.title }}</h3><p>{{ world.activatedStoryHook.value.summary }}</p></div>
        </article>

        <div class="dialogue-layout">
          <section class="dialogue panel">
            <div class="dialogue__log" aria-live="polite">
              <div v-if="!world.dialogueLog.value.length" class="dialogue__opening">
                <p>“{{ world.selectedNpc.value.conversation_style }}”</p>
                <small>选择一种意图，或自由写下你的回应。</small>
              </div>
              <article v-for="(line, index) in world.dialogueLog.value" :key="index" class="dialogue-line" :class="`dialogue-line--${line.role}`">
                <small>{{ line.role === 'player' ? '你' : world.selectedNpc.value.name }}<template v-if="line.tone"> · {{ line.tone }}</template></small>
                <p>{{ line.text }}</p>
              </article>
            </div>
            <div class="quick-lines">
              <button v-for="quick in quickLines" :key="quick.label" type="button" @click="message = quick.text">{{ quick.label }}</button>
            </div>
            <form class="dialogue__form" @submit.prevent="send">
              <textarea v-model="message" maxlength="500" rows="2" placeholder="写下你想说的话…" />
              <button class="button button--primary" type="submit" :disabled="world.busy.value || !message.trim()">{{ world.busy.value ? '等待回应…' : '交谈' }}</button>
            </form>
          </section>

          <aside class="npc-notes">
            <article class="panel"><p class="eyebrow">PUBLIC HISTORY</p><p>{{ world.selectedNpc.value.public_backstory }}</p></article>
            <article class="panel"><p class="eyebrow">SHARED MEMORIES</p><ul v-if="world.memories.value.length" class="memory-list"><li v-for="memory in world.memories.value" :key="memory.memory_id">{{ memory.summary }}</li></ul><p v-else class="muted">你们尚无共同记忆。</p></article>
            <article v-if="world.relationship.value?.active_story_hooks.length" class="panel"><p class="eyebrow">ACTIVE THREADS</p><div class="tag-list"><span v-for="hook in world.relationship.value.active_story_hooks" :key="hook">{{ hook }}</span></div></article>
          </aside>
        </div>

        <article v-if="world.combatTrigger.value" class="combat-invitation">
          <div><p class="eyebrow">COMBAT TRIGGER ARMED</p><h3>⚔ {{ world.combatTrigger.value.title }}</h3><p>{{ world.combatTrigger.value.intro }}</p></div>
          <button class="button button--danger" type="button" :disabled="world.busy.value" @click="beginBattle">接受战斗</button>
        </article>
      </div>

      <div v-else class="empty-state panel"><span v-if="world.busy.value" class="spinner" /><span v-else>◇</span><h3>{{ world.busy.value ? '人物档案正在展开' : '选择一位人物' }}</h3></div>
    </div>

    <EventJournal />
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useCombatStore } from '../../stores/combat'
import { useWorldStore } from '../../stores/world'
import EventJournal from '../exploration/EventJournal.vue'

const world = useWorldStore()
const combat = useCombatStore()
const message = ref('')
const quickLines = [
  { label: '打听近况', text: '这里最近发生了什么值得留意的事？' },
  { label: '主动援助', text: '若你正面对麻烦，也许我能帮上忙。' },
  { label: '追问过去', text: '你愿意说说自己曾经的经历吗？' },
  { label: '发出挑战', text: '我想亲自见识你的本领。' },
]

function initials(name: string): string {
  return name.trim().slice(0, 2) || '？'
}

async function send(): Promise<void> {
  const text = message.value.trim()
  if (!text) return
  message.value = ''
  await world.talk(text)
}

async function beginBattle(): Promise<void> {
  const response = await world.beginCombat()
  if (response) await combat.startNpcBattle(response)
}

onMounted(async () => {
  if (!world.npcs.value.length) await world.loadWorld()
  if (!world.selectedNpc.value && world.npcs.value.length) await world.selectNpc(world.npcs.value[0].npc_id)
})
</script>
