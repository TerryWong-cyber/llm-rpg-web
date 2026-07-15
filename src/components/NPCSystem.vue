<template>
  <section class="w-full max-w-6xl grid gap-5 lg:grid-cols-[minmax(250px,0.8fr)_minmax(0,1.6fr)] animate-fade-in">
    <aside class="rounded-2xl border border-violet-500/20 bg-slate-900/70 p-4 shadow-xl shadow-black/20">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <p class="text-[10px] font-black tracking-[0.25em] text-violet-400">LIVING WORLD</p>
          <h2 class="mt-1 text-lg font-black text-slate-100">🧭 世界人物</h2>
        </div>
        <button @click="loadWorld" :disabled="loading" class="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:border-violet-400 hover:text-violet-200 disabled:opacity-50">刷新</button>
      </div>

      <div class="space-y-2">
        <button v-for="npc in npcs" :key="npc.npc_id" @click="selectNpc(npc.npc_id)"
                :class="['w-full rounded-xl border p-3 text-left transition', selectedNpc?.npc_id === npc.npc_id ? 'border-violet-400 bg-violet-500/15 shadow-lg shadow-violet-900/20' : 'border-slate-800 bg-slate-950/50 hover:border-slate-600']">
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="font-black text-slate-100">{{ npc.name }}</p>
              <p class="mt-0.5 text-xs text-violet-300">{{ npc.title }}</p>
            </div>
            <span v-if="npc.has_combat_profile" class="rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">威胁 {{ npc.combat_threat }}</span>
          </div>
          <p class="mt-2 text-xs text-slate-500">{{ npc.race }} · {{ npc.location?.region }}</p>
        </button>
        <p v-if="!loading && !npcs.length" class="py-6 text-center text-sm text-slate-500">世界暂时没有回应。</p>
      </div>

      <div class="mt-5 border-t border-slate-800 pt-4">
        <p class="mb-2 text-[10px] font-black tracking-widest text-slate-500">📜 世界近闻</p>
        <div class="max-h-40 space-y-2 overflow-y-auto pr-1">
          <p v-for="fact in worldFacts.slice(0, 5)" :key="fact.memory_id" class="rounded-lg bg-slate-950/60 p-2 text-xs leading-relaxed text-slate-400">{{ fact.summary }}</p>
          <p v-if="!worldFacts.length" class="text-xs text-slate-600">尚未发生值得记载的大事。</p>
        </div>
      </div>
    </aside>

    <div class="min-h-[620px] rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl shadow-black/20">
      <div v-if="!selectedNpc" class="flex h-full min-h-[560px] flex-col items-center justify-center text-center">
        <span class="text-6xl">🕯️</span>
        <h2 class="mt-5 text-xl font-black text-slate-200">选择一位人物</h2>
        <p class="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">他们会记住你的承诺、冒犯、战斗与选择。故事并不在一个对话框结束。</p>
      </div>

      <template v-else>
        <div class="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p class="text-[10px] font-black tracking-[0.22em] text-violet-400">{{ selectedNpc.race }} · {{ selectedNpc.gender }}</p>
            <h2 class="mt-1 text-2xl font-black text-slate-50">{{ selectedNpc.name }} <span class="text-sm font-bold text-violet-300">{{ selectedNpc.title }}</span></h2>
            <p class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{{ selectedNpc.appearance }}</p>
            <p class="mt-2 text-xs text-slate-500">📍 {{ selectedNpc.location?.region }} · {{ selectedNpc.location?.landmark }}</p>
          </div>
          <div v-if="relationship" class="grid grid-cols-2 gap-2 text-center text-xs sm:w-48">
            <div class="rounded-lg bg-emerald-500/10 p-2 text-emerald-300">亲近 <b class="ml-1 text-base">{{ relationship.affinity }}</b></div>
            <div class="rounded-lg bg-sky-500/10 p-2 text-sky-300">信任 <b class="ml-1 text-base">{{ relationship.trust }}</b></div>
            <div class="rounded-lg bg-amber-500/10 p-2 text-amber-300">敬重 <b class="ml-1 text-base">{{ relationship.respect }}</b></div>
            <div class="rounded-lg bg-rose-500/10 p-2 text-rose-300">敌意 <b class="ml-1 text-base">{{ relationship.hostility }}</b></div>
          </div>
        </div>

        <div class="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(220px,0.75fr)]">
          <div class="space-y-4">
            <div class="min-h-64 max-h-80 space-y-3 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <div v-if="!dialogueLog.length" class="py-10 text-center text-sm text-slate-600">向 {{ selectedNpc.name }} 开口，世界会从这里开始记住你。</div>
              <div v-for="(line, index) in dialogueLog" :key="index" :class="['max-w-[90%] rounded-xl p-3 text-sm leading-relaxed', line.role === 'player' ? 'ml-auto bg-violet-600/20 text-violet-100' : 'border border-slate-800 bg-slate-900 text-slate-300']">
                <p class="mb-1 text-[10px] font-black tracking-widest" :class="line.role === 'player' ? 'text-violet-300' : 'text-slate-500'">{{ line.role === 'player' ? '你' : selectedNpc.name }}</p>
                {{ line.text }}
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <button v-for="quick in quickLines" :key="quick.label" @click="message = quick.text" class="rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-400 transition hover:border-violet-400 hover:text-violet-200">{{ quick.label }}</button>
            </div>
            <div class="flex gap-2">
              <input v-model="message" @keyup.enter="talk" :disabled="talking" maxlength="500" placeholder="自由输入你的回应、请求或威胁…" class="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-violet-400" />
              <button @click="talk" :disabled="talking || !message.trim()" class="rounded-xl bg-violet-600 px-4 py-2 text-sm font-black text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-slate-700">{{ talking ? '回应中…' : '交谈' }}</button>
            </div>

            <div v-if="armedCombat" class="rounded-xl border border-rose-500/40 bg-rose-950/30 p-4">
              <p class="text-sm font-black text-rose-300">⚔️ {{ armedCombat.title }}</p>
              <p class="mt-1 text-sm leading-relaxed text-rose-100/80">{{ armedCombat.intro }}</p>
              <button @click="startCombat" :disabled="startingCombat" class="mt-3 rounded-lg bg-rose-600 px-4 py-2 text-sm font-black text-white hover:bg-rose-500 disabled:opacity-60">{{ startingCombat ? '布置遭遇…' : '接受战斗' }}</button>
            </div>
          </div>

          <aside class="space-y-4">
            <section class="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <p class="text-[10px] font-black tracking-widest text-slate-500">📖 公开经历</p>
              <p class="mt-2 text-sm leading-relaxed text-slate-400">{{ selectedNpc.public_backstory }}</p>
              <p class="mt-3 text-xs text-slate-500">性格：{{ selectedNpc.personality?.join('、') }}</p>
            </section>
            <section class="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <p class="text-[10px] font-black tracking-widest text-slate-500">🧠 对你的记忆</p>
              <div class="mt-2 max-h-44 space-y-2 overflow-y-auto pr-1">
                <p v-for="memory in npcMemories" :key="memory.memory_id" class="rounded-lg bg-slate-900 p-2 text-xs leading-relaxed text-slate-400">{{ memory.summary }}</p>
                <p v-if="!npcMemories.length" class="text-xs text-slate-600">你们尚无共同经历。</p>
              </div>
            </section>
            <section v-if="relationship?.active_story_hooks?.length" class="rounded-xl border border-amber-500/20 bg-amber-950/10 p-4">
              <p class="text-[10px] font-black tracking-widest text-amber-400">✦ 已激活剧情线</p>
              <p v-for="hook in relationship.active_story_hooks" :key="hook" class="mt-2 text-xs text-amber-100">{{ hook }}</p>
            </section>
          </aside>
        </div>

        <p v-if="error" class="mt-4 rounded-lg border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-200">{{ error }}</p>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import axios from 'axios';

const props = defineProps<{ playerId: string }>();
const emit = defineEmits<{
  (event: 'start-npc-combat', payload: { room_id: string; snapshot: any }): void;
}>();

const API_BASE = 'http://192.168.3.67:8008/api';
const npcs = ref<any[]>([]);
const selectedNpc = ref<any>(null);
const relationship = ref<any>(null);
const npcMemories = ref<any[]>([]);
const worldFacts = ref<any[]>([]);
const dialogueLog = ref<{ role: 'player' | 'npc'; text: string }[]>([]);
const message = ref('');
const loading = ref(false);
const talking = ref(false);
const startingCombat = ref(false);
const armedCombat = ref<any>(null);
const error = ref('');

const quickLines = [
  { label: '打听消息', text: '我想知道这里最近发生了什么。' },
  { label: '主动帮忙', text: '如果你有麻烦，我愿意帮忙。' },
  { label: '表示感谢', text: '谢谢你愿意和我说这些。' },
  { label: '挑衅', text: '交出货单，否则我就动手。' },
];

const loadWorld = async () => {
  loading.value = true;
  error.value = '';
  try {
    const [npcRes, factsRes] = await Promise.all([
      axios.get(`${API_BASE}/world/npcs`),
      axios.get(`${API_BASE}/world/facts`),
    ]);
    npcs.value = npcRes.data.npcs || [];
    worldFacts.value = factsRes.data.facts || [];
    if (!selectedNpc.value && npcs.value.length) await selectNpc(npcs.value[0].npc_id);
  } catch (e: any) {
    error.value = e.response?.data?.detail || '无法连接世界 NPC 服务，请确认后端已启动。';
  } finally {
    loading.value = false;
  }
};

const selectNpc = async (npcId: string) => {
  error.value = '';
  armedCombat.value = null;
  dialogueLog.value = [];
  try {
    const [npcRes, memoriesRes] = await Promise.all([
      axios.get(`${API_BASE}/world/npcs/${npcId}`, { params: { player_id: props.playerId } }),
      axios.get(`${API_BASE}/world/npcs/${npcId}/memories`, { params: { player_id: props.playerId } }),
    ]);
    selectedNpc.value = npcRes.data.npc;
    relationship.value = npcRes.data.relationship;
    npcMemories.value = memoriesRes.data.memories || [];
  } catch (e: any) {
    error.value = e.response?.data?.detail || '读取 NPC 信息失败。';
  }
};

const refreshMemories = async () => {
  if (!selectedNpc.value) return;
  const [npcRes, memoriesRes, factsRes] = await Promise.all([
    axios.get(`${API_BASE}/world/npcs/${selectedNpc.value.npc_id}`, { params: { player_id: props.playerId } }),
    axios.get(`${API_BASE}/world/npcs/${selectedNpc.value.npc_id}/memories`, { params: { player_id: props.playerId } }),
    axios.get(`${API_BASE}/world/facts`),
  ]);
  relationship.value = npcRes.data.relationship;
  npcMemories.value = memoriesRes.data.memories || [];
  worldFacts.value = factsRes.data.facts || [];
};

const talk = async () => {
  const text = message.value.trim();
  if (!selectedNpc.value || !text || talking.value) return;
  talking.value = true;
  error.value = '';
  dialogueLog.value.push({ role: 'player', text });
  message.value = '';
  try {
    const res = await axios.post(`${API_BASE}/world/npcs/${selectedNpc.value.npc_id}/dialogue`, {
      player_id: props.playerId,
      message: text,
    });
    dialogueLog.value.push({ role: 'npc', text: res.data.reply });
    relationship.value = res.data.relationship;
    armedCombat.value = res.data.combat_trigger || null;
    await refreshMemories();
  } catch (e: any) {
    error.value = e.response?.data?.detail || '对话没有得到回应。';
  } finally {
    talking.value = false;
  }
};

const startCombat = async () => {
  if (!selectedNpc.value || !armedCombat.value || startingCombat.value) return;
  startingCombat.value = true;
  error.value = '';
  try {
    const res = await axios.post(`${API_BASE}/world/npcs/${selectedNpc.value.npc_id}/combat/start`, {
      player_id: props.playerId,
      trigger_id: armedCombat.value.trigger_id,
    });
    emit('start-npc-combat', { room_id: res.data.room_id, snapshot: res.data.snapshot });
  } catch (e: any) {
    error.value = e.response?.data?.detail || '无法开始这场遭遇战。';
  } finally {
    startingCombat.value = false;
  }
};

onMounted(loadWorld);
</script>
