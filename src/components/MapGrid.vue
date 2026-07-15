<!-- MapGrid -->
<template>
  <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-6 flex flex-col items-center">
    <div class="flex justify-between w-full items-center mb-6">
      <h3 class="text-rose-500 font-black tracking-widest uppercase">🗺️ 荒野探索</h3>
      <div class="text-xs bg-slate-950 px-3 py-1 rounded-full text-slate-400 border border-slate-800">
        点击地块进行资源采集
      </div>
    </div>

    <!-- 5x5 地图网格 -->
    <div class="grid grid-cols-5 gap-2 w-full max-w-[400px]">
      <div v-for="cell in mapGrid" :key="cell.cell_id"
           @click="handleGather(cell)"
           :class="['aspect-square flex flex-col justify-center items-center rounded-lg border-2 cursor-pointer transition-all duration-200 select-none',
                    cell.is_gathered ? 'bg-slate-950 border-slate-900 opacity-40 cursor-not-allowed' : 'bg-slate-800 border-slate-700 hover:border-emerald-500 hover:-translate-y-1 hover:shadow-lg']">
        <span class="text-3xl filter drop-shadow-md">{{ getTerrainEmoji(cell.terrain_id) }}</span>
        <span class="text-[9px] text-slate-400 mt-1 font-bold">{{ getTerrainName(cell.terrain_id) }}</span>
      </div>
    </div>

    <!-- 采集结果飘字提示区 -->
    <div class="mt-6 h-8 text-emerald-400 text-sm font-bold animate-pulse">
      {{ gatherMessage }}
    </div>

    <!-- 玩家资源背包预览 -->
    <div class="w-full mt-4 border-t border-slate-800 pt-4">
      <h4 class="text-[10px] text-slate-500 mb-2">🎒 我的资源背包</h4>
      <div class="flex flex-wrap gap-2">
        <div v-for="(qty, resId) in materials" :key="resId" v-show="qty > 0"
             class="text-xs bg-slate-950 border border-slate-800 px-2 py-1 rounded flex items-center gap-1">
          <span>{{ resourcesMeta[resId]?.emoji }}</span>
          <span class="text-slate-300">{{ resourcesMeta[resId]?.name }}</span>
          <span class="text-amber-500 font-bold ml-1">{{ qty }}</span>
        </div>
        <div v-if="Object.keys(materials).length === 0" class="text-xs text-slate-600">暂无任何资源</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, onMounted} from 'vue';
import axios from 'axios';

const props = defineProps<{ playerId: string }>();
const API_BASE = 'http://192.168.3.67:8008/api';

const mapGrid = ref<any[]>([]);
const terrainsMeta = ref<any>({});
const resourcesMeta = ref<any>({});
const materials = ref<any>({});
const gatherMessage = ref('准备探索...');

// 加载地图数据
const loadMap = async () => {
  try {
    const res = await axios.post(`${API_BASE}/map/enter`, {player_id: props.playerId});
    mapGrid.value = res.data.map_grid;
    terrainsMeta.value = res.data.terrains_meta;
    resourcesMeta.value = res.data.resources_meta;
    materials.value = res.data.inventory_materials;
  } catch (e) {
    console.error("地图加载失败");
  }
};

const getTerrainEmoji = (tid: string) => terrainsMeta.value[tid]?.emoji || '❓';
const getTerrainName = (tid: string) => terrainsMeta.value[tid]?.name || '未知';

// 点击采集事件
const handleGather = async (cell: any) => {
  if (cell.is_gathered) {
    gatherMessage.value = '⚠️ 这里已经被搜刮一空了';
    return;
  }

  gatherMessage.value = '正在采集中...';
  try {
    const res = await axios.post(`${API_BASE}/map/gather`, {
      player_id: props.playerId,
      cell_id: cell.cell_id
    });

    // 更新 UI 状态
    cell.is_gathered = true;
    gatherMessage.value = `✅ 获得: ${res.data.msg}`;
    materials.value = res.data.inventory_materials;

  } catch (e: any) {
    gatherMessage.value = `❌ 采集失败: ${e.response?.data?.detail}`;
  }
};

onMounted(() => {
  loadMap();
});
</script>