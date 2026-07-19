<template>
  <section v-if="profile && race" class="feature-stack growth-feature growth-workspace">
    <header class="character-summary-bar panel">
      <ItemIcon class="growth-portrait item-icon--portrait" :image-url="race.image_url" :fallback="profile.name.slice(0, 1)" />
      <span><small>{{ race.ancestry }} · {{ race.nation }}</small><strong>{{ profile.name }}</strong></span>
      <div><b>Lv.{{ profile.level }}</b><small>{{ profile.experience }} / {{ profile.experience_to_next }} XP</small></div>
    </header>

    <nav class="segmented growth-tabs" aria-label="角色成长分类">
      <button v-for="tab in tabs" :key="tab.id" type="button" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id"><span>{{ tab.icon }}</span>{{ tab.label }}<small>{{ tab.caption }}</small></button>
    </nav>

    <GrowthAttributesTab v-if="activeTab === 'attributes'" :profile="profile" :race="race" @inventory="emit('inventory')" />
    <GrowthSkillsTab v-else-if="activeTab === 'skills'" :profile="profile" />
    <GrowthBiographyTab v-else :profile="profile" :race="race" />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ItemIcon from '../../components/ui/ItemIcon.vue'
import { useCatalogStore } from '../../stores/catalog'
import { usePlayerStore } from '../../stores/player'
import GrowthAttributesTab from './GrowthAttributesTab.vue'
import GrowthBiographyTab from './GrowthBiographyTab.vue'
import GrowthSkillsTab from './GrowthSkillsTab.vue'

type GrowthTab = 'attributes' | 'skills' | 'biography'
const emit = defineEmits<{ inventory: [] }>()
const player = usePlayerStore()
const catalog = useCatalogStore()
const activeTab = ref<GrowthTab>('attributes')
const profile = computed(() => player.profile.value)
const race = computed(() => { const id = profile.value?.race_id; return id ? catalog.meta.value?.races[id] ?? null : null })
const tabs = [
  { id: 'attributes' as const, icon: '◆', label: '属性', caption: '等级、加点与装备' },
  { id: 'skills' as const, icon: '✦', label: '技能', caption: '能力与战斗配置' },
  { id: 'biography' as const, icon: '⌁', label: '传记', caption: '背景与旅途履历' },
]
watch(activeTab, (tab) => { if (tab === 'biography') void player.refreshProfile() })
onMounted(() => { void player.refreshProfile() })
</script>
