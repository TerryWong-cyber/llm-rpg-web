<!-- src/components/CraftSystem.vue -->
<template>
  <div class="w-full space-y-6 animate-fade-in relative">

    <!-- 顶部配方图鉴按钮 -->
    <div class="absolute -top-12 right-0">
      <button @click="openRecipeBook"
              class="flex items-center gap-2 px-4 py-2 bg-sky-900/40 hover:bg-sky-700/60 border border-sky-500/50 text-sky-300 text-xs font-bold rounded-lg transition shadow-lg backdrop-blur-md">
        <span>📖</span> 炼金配方图鉴
      </button>
    </div>

    <!-- 熔炉本体 -->
    <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl">
      <h2 class="text-lg font-black text-purple-400 mb-4 text-center tracking-widest uppercase">🔮 真理熔炉</h2>

      <!-- 合成槽位展示 -->
      <div class="flex items-center justify-center gap-6 mb-6">
        <div @click="clearSlot(1)"
             class="w-32 h-32 border-2 border-dashed border-slate-700 hover:border-rose-500 rounded-xl flex flex-col justify-center items-center cursor-pointer transition duration-150 bg-slate-950 relative overflow-hidden group">
          <img v-if="craftSlot1?.image_url" :src="craftSlot1.image_url"
               class="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-20 transition"/>
          <div v-if="craftSlot1" class="relative z-10 text-center p-2 animate-fade-in">
            <div class="font-bold text-sm text-rose-400 line-clamp-2 drop-shadow-md">{{ craftSlot1.name }}</div>
            <div class="text-[9px] text-slate-400 mt-2">点击取下</div>
          </div>
          <div v-else class="text-slate-600 text-xs font-bold relative z-10">放入物品 1</div>
        </div>

        <div class="text-3xl text-slate-700 animate-pulse">➕</div>

        <div @click="clearSlot(2)"
             class="w-32 h-32 border-2 border-dashed border-slate-700 hover:border-rose-500 rounded-xl flex flex-col justify-center items-center cursor-pointer transition duration-150 bg-slate-950 relative overflow-hidden group">
          <img v-if="craftSlot2?.image_url" :src="craftSlot2.image_url"
               class="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-20 transition"/>
          <div v-if="craftSlot2" class="relative z-10 text-center p-2 animate-fade-in">
            <div class="font-bold text-sm text-sky-400 line-clamp-2 drop-shadow-md">{{ craftSlot2.name }}</div>
            <div class="text-[9px] text-slate-400 mt-2">点击取下</div>
          </div>
          <div v-else class="text-slate-600 text-xs font-bold relative z-10">放入物品 2</div>
        </div>
      </div>

      <div class="text-center">
        <button @click="doCraft" :disabled="!craftSlot1 || !craftSlot2 || crafting"
                class="px-12 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black tracking-widest rounded-lg shadow-lg shadow-purple-900/40 transition active:scale-95 cursor-pointer">
          {{ crafting ? '🧬 大模型推演中...' : '🧬 发动炼金术' }}
        </button>
      </div>

      <!-- 产出展示弹窗 -->
      <div v-if="craftResult"
           class="mt-6 p-4 bg-purple-950/40 border border-purple-500/50 rounded-xl flex items-center gap-4 animate-bounce shadow-md">
        <div v-if="craftResult.image_url"
             class="w-20 h-20 shrink-0 border border-purple-500/30 rounded-lg overflow-hidden">
          <img :src="craftResult.image_url" alt="icon" class="w-full h-full object-cover"/>
        </div>
        <div class="text-left flex-grow">
          <p class="text-[10px] text-purple-300 tracking-widest mb-1">🎉 熔炼成功！获得奇迹造物：</p>
          <h3 class="text-xl font-black text-amber-400 flex items-center gap-2">
            {{ craftResult.name }}
            <span class="text-[10px] px-2 py-0.5 bg-purple-900/50 border border-purple-500 text-purple-200 rounded">{{
                typeLabel(craftResult.type)
              }}</span>
          </h3>
          <p class="text-xs text-slate-300 mt-1">{{ craftResult.desc }}</p>
          <div class="flex gap-4 mt-2">
            <span class="text-[10px] font-bold text-rose-400"
                  v-if="craftResult.combat_stat > 0">⚡ 属性加成: {{ craftResult.combat_stat }}</span>
            <span class="text-[10px] font-bold text-amber-500">🪙 系统估值: {{ craftResult.value }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 熔炉专用分类背囊 -->
    <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
      <div class="flex gap-2 border-b border-slate-800 pb-3 mb-4">
        <button @click="invTab = 'equip'"
                :class="['px-4 py-1.5 rounded text-xs font-bold transition cursor-pointer', invTab === 'equip' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300']">
          ⚔️ 装备栏
        </button>
        <button @click="invTab = 'item'"
                :class="['px-4 py-1.5 rounded text-xs font-bold transition cursor-pointer', invTab === 'item' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300']">
          🧪 道具栏
        </button>
        <button @click="invTab = 'material'"
                :class="['px-4 py-1.5 rounded text-xs font-bold transition cursor-pointer', invTab === 'material' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300']">
          💎 素材珍品
        </button>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-[250px] overflow-y-auto">
        <div v-for="item in availableCraftItems" :key="item.id" @click="putInSlot(item)"
             class="bg-slate-950 border border-slate-800 hover:border-purple-500 p-3 rounded-lg cursor-pointer transition flex flex-col justify-between hover:-translate-y-0.5 relative overflow-hidden group">
          <img v-if="item.image_url" :src="item.image_url"
               class="absolute inset-0 w-full h-full object-cover opacity-10 group-hover:opacity-20 transition"/>
          <div class="relative z-10">
            <div class="font-bold text-xs text-slate-200 truncate drop-shadow">{{ item.name }}</div>
            <div class="text-[9px] text-slate-400 mt-1 line-clamp-1 leading-relaxed">{{ item.desc }}</div>
            <div class="flex justify-between items-center mt-2 border-t border-slate-800 pt-2">
              <span class="text-[10px] text-amber-500">{{ item.value }} 🪙</span>
              <span class="text-[10px] text-sky-400 font-bold">数量: {{ item.count }}</span>
            </div>
          </div>
        </div>
        <div v-if="availableCraftItems.length === 0" class="col-span-full text-center py-8 text-xs text-slate-600">
          此分类背包下没有可以用于熔炼的物品了
        </div>
      </div>
    </div>

    <!-- 配方图鉴弹窗 (Modal) -->
    <div v-if="showRecipeModal"
         class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div
          class="bg-slate-900 border border-sky-500/50 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        <div class="p-4 bg-sky-950/40 border-b border-sky-900 flex justify-between items-center">
          <h3 class="text-lg font-black text-sky-400 tracking-widest flex items-center gap-2"><span>📖</span> 已解锁炼金图鉴
          </h3>
          <button @click="showRecipeModal = false" class="text-slate-400 hover:text-white transition">✖</button>
        </div>

        <div class="p-6 overflow-y-auto flex-grow bg-slate-950 space-y-4">
          <div v-if="loadingRecipes" class="text-center text-sky-400 animate-pulse py-8 text-sm">正在翻阅古籍...</div>
          <div v-else-if="recipes.length === 0" class="text-center text-slate-500 py-12 text-sm">
            暂无任何成功记录，发挥你的想象力去融合吧！
          </div>

          <!-- 公式列表渲染 -->
          <div v-else v-for="(recipe, index) in recipes" :key="index"
               class="flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
            <!-- 原料区 -->
            <div class="flex items-center gap-2 text-xs font-bold text-slate-300 w-1/3 justify-end">
              <span class="truncate max-w-[100px]" :title="getItemName(recipe.mat1_id)">{{
                  getItemName(recipe.mat1_id)
                }}</span>
              <span class="text-slate-600 mx-1">➕</span>
              <span class="truncate max-w-[100px]" :title="getItemName(recipe.mat2_id)">{{
                  getItemName(recipe.mat2_id)
                }}</span>
            </div>

            <div class="text-sky-500 text-lg">👉</div>

            <!-- 产出物区 -->
            <div class="flex gap-3 items-center w-2/3 border-l border-slate-800 pl-4">
              <div v-if="recipe.result.image_url"
                   class="w-12 h-12 rounded bg-slate-800 border border-slate-700 shrink-0 overflow-hidden">
                <img :src="recipe.result.image_url" class="w-full h-full object-cover"/>
              </div>
              <div class="text-left">
                <div class="text-sm font-black text-amber-400 flex items-center gap-2">
                  {{ recipe.result.name }}
                  <span class="text-[9px] font-normal text-slate-400 border border-slate-700 rounded px-1">{{
                      typeLabel(recipe.result.type)
                    }}</span>
                </div>
                <div class="text-[10px] text-slate-500 mt-1 line-clamp-1" :title="recipe.result.desc">
                  {{ recipe.result.desc }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import {ref, computed} from 'vue';
import axios from 'axios';

const props = defineProps<{
  playerId: string;
  meta: any;
  profile: any;
}>();

const emit = defineEmits(['update:profile']);
const API_BASE = 'http://192.168.3.67:8008/api';

const invTab = ref<'equip' | 'item' | 'material'>('equip');
const craftSlot1 = ref<any>(null);
const craftSlot2 = ref<any>(null);
const crafting = ref(false);
const craftResult = ref<any>(null);

// 图鉴相关状态
const showRecipeModal = ref(false);
const loadingRecipes = ref(false);
const recipes = ref<any[]>([]);

// 辅助函数：根据类型展示标签
const typeLabel = (type: string) => {
  const map: Record<string, string> = {weapon: '⚔️ 武器', armor: '🛡️ 防具', item: '🧪 消耗品', material: '💎 素材'};
  return map[type] || '物品';
};

// 辅助函数：根据ID到全局字典反查物品名字（图鉴用）
const getItemName = (id: string) => {
  if (!props.meta) return id;
  if (props.meta.weapons?.[id]) return props.meta.weapons[id].name;
  if (props.meta.armors?.[id]) return props.meta.armors[id].name;
  if (props.meta.items?.[id]) return props.meta.items[id].name;
  if (props.meta.resources?.[id]) return `${props.meta.resources[id].emoji || ''} ${props.meta.resources[id].name}`;
  return '未知名造物';
};

// 打开图鉴并拉取最新数据
const openRecipeBook = async () => {
  showRecipeModal.value = true;
  loadingRecipes.value = true;
  try {
    const res = await axios.get(`${API_BASE}/game/recipes`);
    recipes.value = res.data.recipes;
  } catch (e) {
    console.error("加载图鉴失败", e);
  } finally {
    loadingRecipes.value = false;
  }
};

const availableCraftItems = computed(() => {
  const p = props.profile;
  if (!p) return [];
  const list: any[] = [];

  if (invTab.value === 'equip') {
    const wMap: Record<string, number> = {};
    p.inventory.weapons.forEach((id: string) => wMap[id] = (wMap[id] || 0) + 1);
    Object.keys(wMap).forEach(id => {
      let count = wMap[id];
      if (craftSlot1.value?.type === 'weapon' && craftSlot1.value?.id === id) count--;
      if (craftSlot2.value?.type === 'weapon' && craftSlot2.value?.id === id) count--;
      if (count > 0 && props.meta?.weapons[id]) list.push({...props.meta.weapons[id], id, type: 'weapon', count});
    });

    const aMap: Record<string, number> = {};
    p.inventory.armors.forEach((id: string) => aMap[id] = (aMap[id] || 0) + 1);
    Object.keys(aMap).forEach(id => {
      let count = aMap[id];
      if (craftSlot1.value?.type === 'armor' && craftSlot1.value?.id === id) count--;
      if (craftSlot2.value?.type === 'armor' && craftSlot2.value?.id === id) count--;
      if (count > 0 && props.meta?.armors[id]) list.push({...props.meta.armors[id], id, type: 'armor', count});
    });
  } else if (invTab.value === 'item') {
    const iMap = p.inventory.items || {};
    Object.keys(iMap).forEach(id => {
      let count = iMap[id];
      if (craftSlot1.value?.type === 'item' && craftSlot1.value?.id === id) count--;
      if (craftSlot2.value?.type === 'item' && craftSlot2.value?.id === id) count--;
      if (count > 0 && props.meta?.items[id]) list.push({...props.meta.items[id], id, type: 'item', count});
    });
  } else if (invTab.value === 'material') {
    const mMap = p.inventory.materials || {};
    Object.keys(mMap).forEach(id => {
      let count = 0;
      let itemData: any = null;
      if (typeof mMap[id] === 'object' && mMap[id] !== null) {
        count = mMap[id].count || 0;
        itemData = {...mMap[id]};
      } else {
        count = mMap[id];
        const metaInfo = props.meta?.resources?.[id];
        if (metaInfo) {
          itemData = {
            id: id,
            name: `${metaInfo.emoji || ''} ${metaInfo.name}`,
            desc: metaInfo.desc,
            value: metaInfo.value,
            type: 'material',
            image_url: metaInfo.image_url
          };
        }
      }
      if (itemData) {
        if (craftSlot1.value?.type === 'material' && craftSlot1.value?.id === id) count--;
        if (craftSlot2.value?.type === 'material' && craftSlot2.value?.id === id) count--;
        if (count > 0) list.push({...itemData, count});
      }
    });
  }
  return list;
});

const putInSlot = (item: any) => {
  if (!craftSlot1.value) craftSlot1.value = item;
  else if (!craftSlot2.value) craftSlot2.value = item;
  else alert('熔炉空间有限，请先点击取下已有物品');
};

const clearSlot = (num: number) => {
  if (num === 1) craftSlot1.value = null;
  if (num === 2) craftSlot2.value = null;
};

const doCraft = async () => {
  if (!craftSlot1.value || !craftSlot2.value) return;
  crafting.value = true;
  craftResult.value = null;
  try {
    const res = await axios.post(`${API_BASE}/game/craft`, {
      player_id: props.playerId,
      item1_type: craftSlot1.value.type,
      item1_id: craftSlot1.value.id,
      item2_type: craftSlot2.value.type,
      item2_id: craftSlot2.value.id,
    });

    const resultItem = res.data.result;
    craftResult.value = resultItem;

    // 🚀 【重点修复】：将生成出来的新物品动态挂载注入到前端的 props.meta 里！
    // 这样当背包渲染时，就能立刻通过 id 找到它的数据模型了。
    if (resultItem.type === 'weapon' && props.meta.weapons) {
      props.meta.weapons[resultItem.id] = resultItem;
    } else if (resultItem.type === 'armor' && props.meta.armors) {
      props.meta.armors[resultItem.id] = resultItem;
    } else if (resultItem.type === 'item' && props.meta.items) {
      props.meta.items[resultItem.id] = resultItem;
    } else if (resultItem.type === 'material' && props.meta.resources) {
      props.meta.resources[resultItem.id] = resultItem;
    }

    // 向上反馈合并更新父组件的 profile (触发背包重新渲染)
    emit('update:profile', res.data.profile);

    craftSlot1.value = null;
    craftSlot2.value = null;
  } catch (e: any) {
    alert(e.response?.data?.detail || '炼金大爆炸！');
  } finally {
    crafting.value = false;
  }
};
</script>