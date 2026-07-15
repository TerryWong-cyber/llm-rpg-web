<!-- App.vue -->
<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-mono selection:bg-rose-500 selection:text-white">
    <!-- Header -->
    <header class="border-b border-slate-900 bg-slate-950/80 p-4 backdrop-blur-md sticky top-0 z-50 shadow-lg shadow-black/40">
      <div class="max-w-6xl mx-auto flex justify-between items-center">
        <h1 class="text-xl font-black tracking-widest text-rose-500 flex items-center gap-3">
          <span class="animate-pulse">⚔️</span> CORE RPG <span class="text-xs px-2 py-0.5 bg-slate-900 text-slate-500 rounded font-normal border border-slate-800">V7.0 模块化版</span>
        </h1>
        <div v-if="playerId" class="flex items-center gap-4">
          <div class="text-xs font-black text-amber-400 bg-amber-950/40 border border-amber-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
            <span>🪙</span> 拥有金币: <span class="text-sm text-amber-300 font-black">{{ profileCache?.gold || 0 }}</span>
          </div>
          <div v-if="roomId" class="text-xs text-sky-400 bg-sky-950/40 px-3 py-1 rounded-full border border-sky-800">
            ROOM: <span class="font-bold tracking-widest">{{ roomId }}</span>
          </div>
        </div>
      </div>
    </header>

    <main class="flex-grow max-w-6xl w-full mx-auto p-4 flex flex-col justify-center relative">
      <div v-if="waitingOpponent" class="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl animate-fade-in">
        <span class="text-6xl animate-spin mb-4">⏳</span>
        <h2 class="text-2xl font-black text-rose-500 tracking-widest uppercase animate-pulse">等待对手行动...</h2>
      </div>

      <CharacterCreate v-if="screen === 'start'" :meta="meta" :loading="loading" @create="handleCreateCharacter" />

      <Lobby v-else-if="screen === 'lobby'"
             :playerId="playerId" :roomId="roomId" :meta="meta" :profile="profileCache"
             @create-room="createRoom" @join-room="joinRoom" @add-ai="addAIToRoom"
             @start-npc-combat="startNpcCombat"
             @update:profile="updateProfile" />

      <PrepRoom v-else-if="screen === 'prep'"
                :meta="meta" :my="my" :gameData="gameData" :loading="loading"
                @submit-prep="submitPrepWS" />

      <BattleField v-else-if="screen === 'battle'"
                   :gameData="gameData" :my="my" :enemy="enemy"
                   @action="submitActionWS" @reset="resetGame" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import CharacterCreate from './components/CharacterCreate.vue';
import Lobby from './components/Lobby.vue';
import PrepRoom from './components/PrepRoom.vue';
import BattleField from './components/BattleField.vue';

const API_BASE = 'http://192.168.3.67:8008/api';
const WS_BASE = 'ws://192.168.3.67:8008/ws/room';

const screen = ref<'start' | 'lobby' | 'prep' | 'battle'>('start');
const loading = ref(false);
const meta = ref<any>(null);
const playerId = ref('');
const roomId = ref('');
const gameData = ref<any>(null);
const profileCache = ref<any>(null);
const waitingOpponent = ref(false);
let ws: WebSocket | null = null;

const isP2 = computed(() => gameData.value?.state?.p2_id === playerId.value);
const my = computed(() => {
  if (!gameData.value?.state) return { inventory: profileCache.value?.inventory };
  const s = gameData.value.state;
  return isP2.value ? { class: s.ai_class, weapon: s.ai_weapon, armor: s.ai_armor, item: s.ai_item, hp: s.ai_hp, mp: s.ai_mp, status: s.ai_status, item_count: s.ai_item_count, inventory: s.ai_inventory }
                    : { class: s.player_class, weapon: s.player_weapon, armor: s.player_armor, item: s.player_item, hp: s.player_hp, mp: s.player_mp, status: s.player_status, item_count: s.player_item_count, inventory: s.player_inventory };
});
const enemy = computed(() => {
  if (!gameData.value?.state) return {};
  const s = gameData.value.state;
  return isP2.value ? { class: s.player_class, weapon: s.player_weapon, armor: s.player_armor, hp: s.player_hp, status: s.player_status }
                    : { class: s.ai_class, weapon: s.ai_weapon, armor: s.ai_armor, hp: s.ai_hp, status: s.ai_status };
});

onMounted(async () => {
  try { meta.value = (await axios.get(`${API_BASE}/game/meta`)).data; } catch(e){}
});

const handleCreateCharacter = async (payload: { name: string, charId: string }) => {
  loading.value = true;
  try {
    const res = await axios.post(`${API_BASE}/game/character/create`, { name: payload.name, character_id: payload.charId });
    playerId.value = res.data.player_id;
    profileCache.value = res.data.profile;
    screen.value = 'lobby';
  } catch(e){} finally { loading.value = false; }
};

const updateProfile = (newProfile: any) => { profileCache.value = newProfile; };

const connectWS = () => {
  ws = new WebSocket(`${WS_BASE}/${roomId.value}/${playerId.value}`);
  ws.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.event === "game_start") { gameData.value = data.snapshot; screen.value = 'prep'; }
    else if (data.event === "snapshot") {
      waitingOpponent.value = false; gameData.value = data.snapshot;
      if (!data.snapshot.game_over && data.snapshot.next_node === "PlayerAction") screen.value = 'battle';
    } else if (data.event === "error") { alert(data.msg); resetGame(); }
  };
};

const createRoom = async () => { roomId.value = (await axios.post(`${API_BASE}/room/create`, { player_id: playerId.value })).data.room_id; connectWS(); };
const joinRoom = async (id: string) => { await axios.post(`${API_BASE}/room/join`, { room_id: id, player_id: playerId.value }); roomId.value = id; connectWS(); };
const addAIToRoom = async () => { await axios.post(`${API_BASE}/room/add_ai`, { room_id: roomId.value }); };
const startNpcCombat = (payload: { room_id: string; snapshot: any }) => {
  ws?.close();
  roomId.value = payload.room_id;
  gameData.value = payload.snapshot;
  waitingOpponent.value = false;
  connectWS();
  screen.value = 'prep';
};
const submitPrepWS = (p: any) => { waitingOpponent.value = true; ws?.send(JSON.stringify({ action: "prep", ...p })); };
const submitActionWS = (key: string) => { waitingOpponent.value = true; ws?.send(JSON.stringify({ action: "combat", action_key: key })); };
const resetGame = () => { ws?.close(); ws = null; screen.value = 'lobby'; gameData.value = null; roomId.value = ''; waitingOpponent.value = false; };
</script>
