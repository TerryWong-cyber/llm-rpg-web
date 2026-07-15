<template>
  <div class="max-w-xl mx-auto w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
    <div class="text-center space-y-2">
      <div class="text-4xl">👑</div>
      <h2 class="text-xl font-black tracking-widest text-rose-500">创建你的勇士档案</h2>
    </div>
    <div class="space-y-4">
      <div class="space-y-1.5">
        <label class="text-xs font-black tracking-widest text-slate-400">1. 输入角色名称</label>
        <input v-model="characterName" type="text" placeholder="例如：亚瑟..."
               class="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 p-3 rounded-lg text-sm text-slate-200 focus:outline-none transition"/>
      </div>
      <div class="space-y-2">
        <label class="text-xs font-black tracking-widest text-slate-400">2. 挑选初始契约职业</label>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label v-for="(v, k) in meta?.characters" :key="k"
                 :class="['relative p-3 rounded-lg border text-xs cursor-pointer transition', selectedChar === k ? 'border-rose-500 bg-rose-950/20 text-rose-100' : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700']">
            <input type="radio" :value="k" v-model="selectedChar" class="hidden"/>
            <div class="font-bold text-sm mb-1" :class="selectedChar === k ? 'text-rose-400' : 'text-slate-300'">
              {{ v.name }}
            </div>
            <p class="text-[10px] text-slate-500 truncate">{{ v.desc }}</p>
          </label>
        </div>
      </div>
    </div>
    <button @click="$emit('create', { name: characterName, charId: selectedChar })"
            :disabled="!characterName.trim() || !selectedChar || loading"
            class="w-full py-3.5 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white font-bold rounded-lg transition cursor-pointer">
      建立档案并踏入大厅
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
defineProps<{ meta: any; loading: boolean; }>();
defineEmits(['create']);
const characterName = ref('');
const selectedChar = ref('');
</script>