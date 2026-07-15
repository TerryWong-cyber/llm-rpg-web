<template>
  <div class="space-y-6 py-4 my-auto animate-fade-in w-full max-w-4xl mx-auto">
    <div class="flex justify-between items-center bg-slate-900/40 border border-slate-900 p-4 rounded-xl shadow-md">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-sm font-bold">
        <span>🌍</span> 战场环境: {{ gameData?.state.environment }}
      </div>
      <div class="text-slate-400 text-xs">请选择本次出战装备</div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
      <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col shadow-xl">
        <h3 class="text-sm font-black text-rose-500 mb-4 border-b border-slate-800 pb-2">⚔️ 挑选主武器</h3>
        <div class="space-y-3 overflow-y-auto max-h-[350px] pr-1">
          <label v-for="(v, k) in meta?.weapons" :key="k" v-show="my.inventory?.weapons?.includes(k)"
                 :class="['relative block p-4 rounded-lg border cursor-pointer', selectedWeapon === k ? 'border-rose-500 bg-rose-950/20' : 'border-slate-800 bg-slate-950/50 hover:border-slate-700']">
            <input type="radio" :value="k" v-model="selectedWeapon" class="hidden"/>
            <div class="font-bold text-slate-200">{{ v.name }}</div>
          </label>
        </div>
      </div>

      <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col shadow-xl">
        <h3 class="text-sm font-black text-rose-500 mb-4 border-b border-slate-800 pb-2">🛡️ 挑选护甲</h3>
        <div class="space-y-3 overflow-y-auto max-h-[350px] pr-1">
          <label v-for="(v, k) in meta?.armors" :key="k" v-show="my.inventory?.armors?.includes(k)"
                 :class="['relative block p-4 rounded-lg border cursor-pointer', selectedArmor === k ? 'border-rose-500 bg-rose-950/20' : 'border-slate-800 bg-slate-950/50 hover:border-slate-700']">
            <input type="radio" :value="k" v-model="selectedArmor" class="hidden"/>
            <div class="font-bold text-slate-200">{{ v.name }}</div>
          </label>
        </div>
      </div>

      <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col shadow-xl">
        <h3 class="text-sm font-black text-rose-500 mb-4 border-b border-slate-800 pb-2">🧪 携带炼金道具</h3>
        <div class="space-y-3 overflow-y-auto max-h-[350px] pr-1">
          <label v-for="(v, k) in meta?.items" :key="k" v-show="(my.inventory?.items?.[k] ?? 0) > 0"
                 :class="['relative block p-4 rounded-lg border cursor-pointer', selectedItem === k ? 'border-rose-500 bg-rose-950/20' : 'border-slate-800 bg-slate-950/50 hover:border-slate-700']">
            <input type="radio" :value="k" v-model="selectedItem" class="hidden"/>
            <div class="font-bold text-slate-200">{{ v.name }}</div>
            <div class="text-xs text-amber-500 mt-1">剩余: {{ my.inventory?.items?.[k] ?? 0 }}</div>
          </label>
        </div>
      </div>
    </div>

    <div class="text-center pt-4">
      <button @click="$emit('submit-prep', { weapon_id: selectedWeapon, armor_id: selectedArmor, item_id: selectedItem || null })"
              :disabled="!selectedWeapon || !selectedArmor || loading"
              class="px-16 py-4 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white font-black tracking-widest rounded-xl shadow-lg transition active:scale-95">
        装备完毕，进入战斗！
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
defineProps<{ meta: any; my: any; gameData: any; loading: boolean; }>();
defineEmits(['submit-prep']);
const selectedWeapon = ref('');
const selectedArmor = ref('');
const selectedItem = ref('');
</script>