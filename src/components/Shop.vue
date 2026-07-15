<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in w-full">
    <!-- 武器店 -->
    <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-xl">
      <h3 class="text-xs font-black text-amber-500 mb-4 border-b border-slate-800 pb-2 uppercase">🛒 武器集市</h3>
      <div class="space-y-3 max-h-[400px] overflow-y-auto">
        <div v-for="(v, k) in meta?.weapons" :key="k" class="bg-slate-950 p-3 rounded border border-slate-800 flex justify-between items-center">
          <span class="text-xs font-bold text-slate-200">{{ v.name }}</span>
          <div class="flex gap-2">
            <button @click="trade('buy', 'weapon', k)" :disabled="profile?.inventory?.weapons?.includes(k) || profile?.gold < v.value || loading"
                    class="px-2 py-1 bg-amber-700/40 text-amber-300 disabled:opacity-20 rounded text-[9px] font-bold cursor-pointer">买:{{ v.value }}</button>
            <button @click="trade('sell', 'weapon', k)" :disabled="!profile?.inventory?.weapons?.includes(k) || loading"
                    class="px-2 py-1 bg-slate-800 text-slate-400 disabled:opacity-20 rounded text-[9px] font-bold cursor-pointer">卖:{{ Math.floor(v.value / 2) }}</button>
          </div>
        </div>
      </div>
    </div>
    <!-- 道具店 -->
    <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-xl">
      <h3 class="text-xs font-black text-amber-500 mb-4 border-b border-slate-800 pb-2 uppercase">🧪 炼金消耗品</h3>
      <div class="space-y-3 max-h-[400px] overflow-y-auto">
        <div v-for="(v, k) in meta?.items" :key="k" class="bg-slate-950 p-3 rounded border border-slate-800 flex justify-between items-center">
          <span class="text-xs font-bold text-slate-200">{{ v.name }} (存:{{ profile?.inventory?.items?.[k] ?? 0 }})</span>
          <div class="flex gap-2">
            <button @click="trade('buy', 'item', k)" :disabled="profile?.gold < v.value || loading"
                    class="px-2 py-1 bg-amber-700/40 text-amber-300 disabled:opacity-20 rounded text-[9px] font-bold cursor-pointer">买:{{ v.value }}</button>
            <button @click="trade('sell', 'item', k)" :disabled="!(profile?.inventory?.items?.[k] > 0) || loading"
                    class="px-2 py-1 bg-slate-800 text-slate-400 disabled:opacity-20 rounded text-[9px] font-bold cursor-pointer">卖:{{ Math.floor(v.value / 2) }}</button>
          </div>
        </div>
      </div>
    </div>
    <!-- 素材回收站 -->
    <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-xl">
      <h3 class="text-xs font-black text-purple-400 mb-4 border-b border-slate-800 pb-2 uppercase">💎 素材回收站</h3>
      <div class="space-y-3 max-h-[400px] overflow-y-auto">
        <div v-for="(v, k) in profile?.inventory?.materials" :key="k" class="bg-slate-950 p-3 rounded border border-slate-800 flex justify-between items-center">
          <div>
            <span class="text-xs font-bold text-purple-300 block truncate max-w-[120px]">{{ v.name || meta?.resources?.[k]?.name }}</span>
            <span class="text-[9px] text-slate-500">剩余: {{ v.count ?? v }}</span>
          </div>
          <button @click="trade('sell', 'material', k)" :disabled="(v.count ?? v) <= 0 || loading"
                  class="px-3 py-1.5 bg-slate-800 hover:bg-rose-950/40 text-slate-300 border border-slate-700 disabled:opacity-20 rounded text-[9px] font-bold cursor-pointer">
            变现:+{{ Math.floor((v.value || meta?.resources?.[k]?.value) / 2) }}
          </button>
        </div>
        <div v-if="!profile?.inventory?.materials || Object.keys(profile.inventory.materials).length === 0" class="text-xs text-slate-600 text-center py-12">无素材可回收</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import axios from 'axios';
const props = defineProps<{ playerId: string; meta: any; profile: any; }>();
const emit = defineEmits(['update:profile']);
const loading = ref(false);

const trade = async (action: 'buy' | 'sell', type: string, id: string) => {
  loading.value = true;
  try {
    // 假设后端的大厅交易不需要 thread_id
    const res = await axios.post(`http://192.168.3.67:8008/api/game/shop/${action}`, {
      player_id: props.playerId, item_type: type, item_id: id
    });
    // 购买/出售后，后端应该返回最新的 profile
    if (res.data.profile) emit('update:profile', res.data.profile);
    else emit('update:profile', res.data.state ? res.data.state[`${props.playerId}_inventory`] : res.data); // 兼容容错
  } catch (e) {
    alert('交易失败');
  } finally {
    loading.value = false;
  }
};
</script>