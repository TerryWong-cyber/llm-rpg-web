<!-- Inventory-->
<template>
  <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-6 w-full animate-fade-in shadow-xl">
    <h2 class="text-lg font-black text-emerald-400 mb-6 text-center tracking-widest uppercase">🎒 我的行囊</h2>

    <div class="flex gap-2 border-b border-slate-800 pb-3 mb-4">
      <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
              :class="['px-4 py-1.5 rounded text-xs font-bold transition cursor-pointer', activeTab === tab.id ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300']">
        {{ tab.label }}
      </button>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto">
      <div v-for="item in displayItems" :key="item.id"
           class="bg-slate-950 border border-slate-800 p-3 rounded-lg flex flex-col justify-between hover:border-slate-600 transition">
        <div>
          <div class="font-bold text-xs text-slate-200 truncate">{{ item.name }}</div>
          <div class="text-[9px] text-slate-500 mt-1 line-clamp-2">{{ item.desc }}</div>
        </div>
        <div class="flex justify-between items-center mt-3 border-t border-slate-800 pt-2">
          <span class="text-[10px] text-amber-500">价值: {{ item.value }}</span>
          <span class="text-[10px] text-sky-400 font-bold" v-if="item.count > 1">x{{ item.count }}</span>
        </div>
      </div>
      <div v-if="displayItems.length === 0" class="col-span-full text-center py-12 text-sm text-slate-600">
        该分类下空空如也
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, computed} from 'vue';

const props = defineProps<{ profile: any; meta: any; }>();
const activeTab = ref('weapons');
const tabs = [
  {id: 'weapons', label: '⚔️ 军械'},
  {id: 'armors', label: '🛡️ 护甲'},
  {id: 'items', label: '🧪 道具'},
  {id: 'materials', label: '💎 素材'}
];

const displayItems = computed(() => {
  if (!props.profile || !props.profile.inventory) return [];
  const inv = props.profile.inventory;
  const list: any[] = [];

  if (activeTab.value === 'weapons') {
    const counts = inv.weapons.reduce((acc: any, id: string) => {
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {});
    Object.keys(counts).forEach(id => {
      if (props.meta?.weapons[id]) list.push({id, ...props.meta.weapons[id], count: counts[id]});
    });
  } else if (activeTab.value === 'armors') {
    const counts = inv.armors.reduce((acc: any, id: string) => {
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {});
    Object.keys(counts).forEach(id => {
      if (props.meta?.armors[id]) list.push({id, ...props.meta.armors[id], count: counts[id]});
    });
  } else if (activeTab.value === 'items') {
    Object.keys(inv.items || {}).forEach(id => {
      if (inv.items[id] > 0 && props.meta?.items[id]) list.push({id, ...props.meta.items[id], count: inv.items[id]});
    });
  } else if (activeTab.value === 'materials') {
    Object.keys(inv.materials || {}).forEach(id => {
      const mat = inv.materials[id];
      if (typeof mat === 'object') {
        if (mat.count > 0) list.push({...mat, id});
      } else if (mat > 0 && props.meta?.resources?.[id]) {
        list.push({
          id,
          name: `${props.meta.resources[id].emoji} ${props.meta.resources[id].name}`,
          desc: props.meta.resources[id].desc,
          value: props.meta.resources[id].value,
          count: mat
        });
      }
    });
  }
  return list;
});
</script>