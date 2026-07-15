<template>
  <div class="w-full space-y-6 animate-fade-in my-auto flex flex-col items-center">
    <!-- 主城核心地标导航 -->
    <div class="flex flex-wrap justify-center gap-3 bg-slate-900/40 p-2 rounded-xl border border-slate-800 w-full max-w-3xl">
      <button @click="lobbyTab = 'duel'" :class="tabClass('duel', 'rose')">⚔️ 战备大厅</button>
      <button @click="lobbyTab = 'inventory'" :class="tabClass('inventory', 'emerald')">🎒 我的行囊</button>
      <button @click="lobbyTab = 'shop'" :class="tabClass('shop', 'amber')">🛒 交易集市</button>
      <button @click="lobbyTab = 'explore'" :class="tabClass('explore', 'sky')">🗺️ 荒野探索</button>
      <button @click="lobbyTab = 'npcs'" :class="tabClass('npcs', 'violet')">🧭 世界人物</button>
      <button @click="lobbyTab = 'craft'" :class="tabClass('craft', 'purple')">🔮 炼金工坊</button>
    </div>

    <!-- 1. 战备大厅 (建房/加房) -->
    <div v-if="lobbyTab === 'duel'" class="w-full max-w-xl space-y-6">
      <div v-if="!roomId" class="grid grid-cols-2 gap-4">
        <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-center space-y-4 shadow-xl">
          <div class="text-4xl">⚔️</div>
          <h3 class="font-black text-rose-400">发起决斗房间</h3>
          <button @click="$emit('create-room')" class="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold transition cursor-pointer">生成房间号</button>
        </div>
        <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-center space-y-4 shadow-xl">
          <div class="text-4xl">🔗</div>
          <h3 class="font-black text-sky-400">加入已有房间</h3>
          <input v-model="joinRoomId" type="text" placeholder="输入 4 位房间号" class="w-full text-center bg-slate-950 border border-slate-800 p-2 rounded text-sm text-slate-200 outline-none"/>
          <button @click="$emit('join-room', joinRoomId)" :disabled="!joinRoomId" class="w-full py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white rounded font-bold transition cursor-pointer">连入战场</button>
        </div>
      </div>
      <div v-else class="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center space-y-6 animate-pulse shadow-xl">
        <h2 class="text-2xl font-black text-rose-500 tracking-widest">你的决斗房间号</h2>
        <div class="text-6xl font-black text-white tracking-widest bg-slate-950 py-4 rounded-xl border border-slate-800">{{ roomId }}</div>
        <p class="text-sm text-slate-400">正在等待真人对手加入...</p>
        <button @click="$emit('add-ai')" class="text-xs text-emerald-500 underline hover:text-emerald-400 cursor-pointer">等不及了？点击召唤 AI 人机对战</button>
      </div>
    </div>

    <!-- 独立子系统按需挂载 -->
    <Inventory v-if="lobbyTab === 'inventory'" :profile="profile" :meta="meta" class="max-w-4xl" />
    <Shop v-if="lobbyTab === 'shop'" :playerId="playerId" :profile="profile" :meta="meta" @update:profile="$emit('update:profile', $event)" class="max-w-5xl" />
    <MapGrid v-if="lobbyTab === 'explore'" :playerId="playerId" @update:profile="$emit('update:profile', $event)" />
    <NPCSystem v-if="lobbyTab === 'npcs'" :playerId="playerId" @start-npc-combat="$emit('start-npc-combat', $event)" />
    <CraftSystem v-if="lobbyTab === 'craft'" :playerId="playerId" :meta="meta" :profile="profile" @update:profile="$emit('update:profile', $event)" class="max-w-xl" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Inventory from './Inventory.vue';
import Shop from './Shop.vue';
import MapGrid from './MapGrid.vue';
import CraftSystem from './CraftSystem.vue';
import NPCSystem from './NPCSystem.vue';

defineProps<{ playerId: string; roomId: string; meta: any; profile: any; }>();
defineEmits(['create-room', 'join-room', 'add-ai', 'update:profile', 'start-npc-combat']);

const lobbyTab = ref('duel');
const joinRoomId = ref('');

const tabClass = (id: string, color: string) => {
  const activeBg = { 'rose': 'bg-rose-600', 'emerald': 'bg-emerald-600', 'amber': 'bg-amber-600', 'sky': 'bg-sky-600', 'violet': 'bg-violet-600', 'purple': 'bg-purple-600' }[color];
  return ['px-6 py-2 rounded-lg font-black transition cursor-pointer text-sm', lobbyTab.value === id ? `${activeBg} text-white shadow-md` : 'text-slate-400 hover:bg-slate-800/60'];
};
</script>
