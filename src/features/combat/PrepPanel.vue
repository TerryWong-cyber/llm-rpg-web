<template>
  <section class="combat-stage prep-stage">
    <header class="combat-stage__header">
      <div><p class="eyebrow">BEFORE THE FIRST BELL</p><h1>选择本次出战装备</h1><p>{{ snapshot.state.environment || '未知战场' }} · {{ snapshot.state.game_mode }}</p></div>
      <button class="button button--ghost" type="button" @click="combat.leaveRoom">退出房间</button>
    </header>

    <div class="global-resource-notice panel">
      <strong>资源不会在开战时自动恢复</strong>
      <span>生命 {{ player.profile.value?.current_hp ?? 0 }}/{{ player.profile.value?.max_hp ?? 0 }}</span>
      <span>法力 {{ player.profile.value?.current_mp ?? 0 }}/{{ player.profile.value?.max_mp ?? 0 }}</span>
      <span>精力 {{ player.profile.value?.stamina ?? 0 }}/{{ player.profile.value?.max_stamina ?? 0 }}</span>
      <small>更换提高生命上限的护甲不会凭空治疗；扎营可恢复部分资源。</small>
    </div>

    <div class="loadout-grid">
      <fieldset class="loadout-column panel">
        <legend><span>01</span> 主武器</legend>
        <label v-for="id in ownedWeapons" :key="id" class="loadout-option" :class="{ selected: weaponId === id }">
          <input v-model="weaponId" type="radio" :value="id" />
          <ItemIcon class="loadout-option__icon" :image-url="meta.weapons[id]?.image_url" fallback="⚔" /><span><strong>{{ meta.weapons[id]?.name ?? id }}</strong><small>{{ meta.weapons[id]?.desc }}</small></span>
        </label>
      </fieldset>
      <fieldset class="loadout-column panel">
        <legend><span>02</span> 护甲</legend>
        <label v-for="id in ownedArmors" :key="id" class="loadout-option" :class="{ selected: armorId === id }">
          <input v-model="armorId" type="radio" :value="id" />
          <ItemIcon class="loadout-option__icon" :image-url="meta.armors[id]?.image_url" fallback="◈" /><span><strong>{{ meta.armors[id]?.name ?? id }}</strong><small>{{ meta.armors[id]?.desc }}</small></span>
        </label>
      </fieldset>
    </div>

    <footer class="prep-footer">
      <div><p class="eyebrow">SELECTED LOADOUT</p><strong>{{ meta.weapons[weaponId]?.name || '未选武器' }} · {{ meta.armors[armorId]?.name || '未选护甲' }}</strong></div>
      <button class="button button--primary button--large" type="button" :disabled="!weaponId || !armorId || combat.waitingForSnapshot.value" @click="submit">
        {{ combat.waitingForSnapshot.value ? '等待服务器确认…' : '确认装备' }}
      </button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CombatSnapshot, GameMeta } from '../../contracts'
import ItemIcon from '../../components/ui/ItemIcon.vue'
import { useCombatStore } from '../../stores/combat'
import { usePlayerStore } from '../../stores/player'

const props = defineProps<{ snapshot: CombatSnapshot; meta: GameMeta }>()
const combat = useCombatStore()
const player = usePlayerStore()
const weaponId = ref('')
const armorId = ref('')

const inventory = computed(() => combat.me.value?.inventory)
const ownedWeapons = computed(() => 'weapons' in (inventory.value ?? {}) ? [...new Set(inventory.value.weapons)] : [])
const ownedArmors = computed(() => 'armors' in (inventory.value ?? {}) ? [...new Set(inventory.value.armors)] : [])

watch(ownedWeapons, (ids) => {
  if (!ids.includes(weaponId.value)) {
    const equipped = player.profile.value?.equipped_weapon_id ?? ''
    weaponId.value = ids.includes(equipped) ? equipped : ids[0] ?? ''
  }
}, { immediate: true })
watch(ownedArmors, (ids) => {
  if (!ids.includes(armorId.value)) {
    const equipped = player.profile.value?.equipped_armor_id ?? ''
    armorId.value = ids.includes(equipped) ? equipped : ids[0] ?? ''
  }
}, { immediate: true })

function submit(): void {
  combat.submitPrep({ weapon_id: weaponId.value, armor_id: armorId.value, item_id: null })
}
</script>
