<template>
  <section class="growth-tab-stack biography-view">
    <article class="panel biography-origin">
      <ItemIcon class="biography-origin__portrait" :image-url="race.image_url" :fallback="profile.name.slice(0, 1)" />
      <div><p class="eyebrow">CHARACTER BACKGROUND</p><h2>{{ profile.name }}</h2><h3>{{ race.name }} · {{ race.ancestry }}</h3><p>{{ race.background }}</p>
        <div class="tag-list"><span v-for="trait in race.traits" :key="trait">{{ trait }}</span></div>
      </div>
      <dl><div><dt>出生地</dt><dd>{{ race.birthplace.settlement_name }}</dd></div><div><dt>创建时间</dt><dd>{{ createdAtLabel }}</dd></div><div><dt>旅途记录</dt><dd>{{ profile.chronicle.length }} 条</dd></div></dl>
    </article>

    <article class="panel biography-timeline-panel">
      <header><div><p class="eyebrow">LIFE CHRONICLE</p><h3>角色履历</h3></div><small>仅记录改变角色命运的重要经历</small></header>
      <nav class="chronicle-filters" aria-label="履历筛选">
        <button v-for="item in filters" :key="item.id" type="button" :class="{ active: activeFilter === item.id }" @click="activeFilter = item.id">{{ item.label }} <span>{{ item.count }}</span></button>
      </nav>
      <div v-if="filteredEntries.length" class="chronicle-timeline">
        <article v-for="entry in filteredEntries" :key="entry.entry_id" class="chronicle-entry" :class="`chronicle-entry--${entry.category}`">
          <span class="chronicle-entry__mark">{{ entry.emoji }}</span>
          <div><small>{{ categoryLabel(entry.category) }} · {{ gameDate(entry) }}</small><h3>{{ entry.title }}</h3><p>{{ entry.description }}</p></div>
        </article>
      </div>
      <div v-else class="empty-state"><span>◇</span><h3>这段传记尚未落笔</h3><p>升级、习得技能、完成任务和重要战斗会被记录在这里。</p></div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CharacterChronicleEntry, ChronicleCategory, PlayerProfile, RaceDefinition } from '../../contracts'
import ItemIcon from '../../components/ui/ItemIcon.vue'

type ChronicleFilter = 'all' | 'growth' | 'quest' | 'exploration' | 'combat'
const props = defineProps<{ profile: PlayerProfile; race: RaceDefinition }>()
const activeFilter = ref<ChronicleFilter>('all')
const belongsTo = (entry: CharacterChronicleEntry, filter: ChronicleFilter): boolean => filter === 'all' || (filter === 'growth' ? ['origin', 'growth', 'skill'].includes(entry.category) : entry.category === filter)
const filters = computed(() => ([
  { id: 'all' as const, label: '全部', count: props.profile.chronicle.length },
  { id: 'growth' as const, label: '成长', count: props.profile.chronicle.filter((entry) => belongsTo(entry, 'growth')).length },
  { id: 'quest' as const, label: '任务', count: props.profile.chronicle.filter((entry) => entry.category === 'quest').length },
  { id: 'exploration' as const, label: '探索', count: props.profile.chronicle.filter((entry) => entry.category === 'exploration').length },
  { id: 'combat' as const, label: '战斗', count: props.profile.chronicle.filter((entry) => entry.category === 'combat').length },
]))
const filteredEntries = computed(() => [...props.profile.chronicle].reverse().filter((entry) => belongsTo(entry, activeFilter.value)))
const createdAtLabel = computed(() => new Date(props.profile.created_at).toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }))
function categoryLabel(category: ChronicleCategory): string { return ({ origin: '起源', growth: '成长', skill: '技能', quest: '任务', exploration: '探索', combat: '战斗' } as Record<ChronicleCategory, string>)[category] }
function gameDate(entry: CharacterChronicleEntry): string { return entry.year == null ? '时间未载' : `${entry.year}年${entry.month}月${entry.day}日 ${String(entry.hour ?? 0).padStart(2, '0')}:00` }
</script>
