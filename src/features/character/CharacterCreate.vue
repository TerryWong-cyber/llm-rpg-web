<template>
  <section class="entry-layout">
    <div class="entry-story">
      <p class="eyebrow">A NEW CHAPTER</p>
      <h1>远境旅人志</h1>
      <p class="entry-story__lead">选择血脉与出生国度，而不是预先决定职业。你的道路将由升级、加点、装备与经历共同塑造。</p>
      <div class="entry-story__runes" aria-hidden="true"><span>✦</span><span>⌁</span><span>✧</span></div>
    </div>

    <form class="panel character-form" @submit.prevent="submit">
      <div class="section-heading">
        <div>
          <p class="eyebrow">TRAVELER RECORD</p>
          <h2>建立旅人档案</h2>
        </div>
        <span class="step-badge">01</span>
      </div>

      <label class="field">
        <span>旅人姓名</span>
        <input v-model.trim="name" maxlength="40" minlength="1" autocomplete="off" placeholder="例如：伊莱恩" />
        <small>{{ name.length }}/40</small>
      </label>

      <fieldset class="character-picker">
        <legend>选择种族与出生国度</legend>
        <label
          v-for="(race, id) in meta?.races"
          :key="id"
          class="character-option"
          :class="{ 'character-option--selected': selectedId === id }"
        >
          <input v-model="selectedId" type="radio" :value="id" />
          <ItemIcon class="character-option__sigil" :image-url="race.image_url" :fallback="sigilFor(String(id))" />
          <span class="character-option__body">
            <strong>{{ race.name }}</strong>
            <small>{{ race.background }}</small>
            <span class="character-option__stats">
              <b>体 {{ race.base_attributes.vitality }}</b><b>力 {{ race.base_attributes.strength }}</b><b>敏 {{ race.base_attributes.agility }}</b><b>智 {{ race.base_attributes.wisdom }}</b><b>运 {{ race.base_attributes.luck }}</b>
            </span>
            <span class="race-origin">⌂ {{ race.birthplace.settlement_name }} · {{ race.nation }}</span>
            <span class="race-features"><i>特长</i>{{ race.strengths.join('；') }}</span>
            <span class="race-features race-features--weak"><i>弱点</i>{{ race.weaknesses.join('；') }}</span>
            <span v-if="race.exclusive_skills[0]" class="race-skill">专属技能 · {{ race.exclusive_skills[0].name }}：{{ race.exclusive_skills[0].desc }}</span>
          </span>
        </label>
      </fieldset>

      <button class="button button--primary button--large" type="submit" :disabled="busy || !valid">
        <span>{{ busy ? '正在刻写档案…' : '踏入远境' }}</span><span aria-hidden="true">→</span>
      </button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { GameMeta } from '../../contracts'
import ItemIcon from '../../components/ui/ItemIcon.vue'

const props = defineProps<{ meta: GameMeta | null; busy: boolean }>()
const emit = defineEmits<{ create: [payload: { name: string; raceId: string }] }>()

const name = ref('')
const selectedId = ref('')
const valid = computed(() => name.value.length >= 1 && name.value.length <= 40 && Boolean(selectedId.value))

watch(() => props.meta, (meta) => {
  if (!selectedId.value && meta) selectedId.value = Object.keys(meta.races)[0] ?? ''
}, { immediate: true })

function sigilFor(id: string): string {
  const sigils = ['⚔', '✦', '☽', '♜', '❖']
  return sigils[Math.abs([...id].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % sigils.length]
}

function submit(): void {
  if (!valid.value) return
  emit('create', { name: name.value, raceId: selectedId.value })
}
</script>
