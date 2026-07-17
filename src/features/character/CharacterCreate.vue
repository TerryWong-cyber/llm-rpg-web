<template>
  <section class="entry-layout">
    <div class="entry-story">
      <p class="eyebrow">A NEW CHAPTER</p>
      <h1>远境旅人志</h1>
      <p class="entry-story__lead">选择你的起点。每一次探索、相遇与交锋，都将由世界真实记住。</p>
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
        <legend>选择初始契约</legend>
        <label
          v-for="(character, id) in meta?.characters"
          :key="id"
          class="character-option"
          :class="{ 'character-option--selected': selectedId === id }"
        >
          <input v-model="selectedId" type="radio" :value="id" />
          <ItemIcon class="character-option__sigil" :image-url="character.image_url" :fallback="sigilFor(String(id))" />
          <span class="character-option__body">
            <strong>{{ character.name }}</strong>
            <small>{{ character.desc }}</small>
            <span class="character-option__stats">
              <b>体 {{ character.hp }}</b><b>力 {{ character.str }}</b><b>敏 {{ character.agi }}</b><b>智 {{ character.int }}</b>
            </span>
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
const emit = defineEmits<{ create: [payload: { name: string; characterId: string }] }>()

const name = ref('')
const selectedId = ref('')
const valid = computed(() => name.value.length >= 1 && name.value.length <= 40 && Boolean(selectedId.value))

watch(() => props.meta, (meta) => {
  if (!selectedId.value && meta) selectedId.value = Object.keys(meta.characters)[0] ?? ''
}, { immediate: true })

function sigilFor(id: string): string {
  const sigils = ['⚔', '✦', '☽', '♜', '❖']
  return sigils[Math.abs([...id].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % sigils.length]
}

function submit(): void {
  if (!valid.value) return
  emit('create', { name: name.value, characterId: selectedId.value })
}
</script>
