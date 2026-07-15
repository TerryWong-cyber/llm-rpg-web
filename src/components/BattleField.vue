<template>
  <div v-if="gameData" class="grid grid-cols-1 lg:grid-cols-12 gap-6 my-auto items-stretch w-full">
    <!-- 我方面板 -->
    <div
        class="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-xl animate-fade-in">
      <div class="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
        <span class="text-lg font-black text-rose-400">{{ my.class?.name }}</span>
        <span
            class="text-[10px] px-2.5 py-0.5 bg-rose-950/30 text-rose-400 rounded-full border border-rose-500/20 font-bold">我方</span>
      </div>
      <div class="space-y-1.5 mb-4">
        <div class="flex justify-between text-xs font-bold"><span class="text-rose-500">❤️ HP</span><span
            class="text-rose-400">{{ my.hp }}</span></div>
        <div class="w-full h-4 bg-slate-950 rounded-full overflow-hidden p-[2px] border border-slate-850">
          <div class="bg-rose-600 h-full rounded-full transition-all duration-500"
               :style="{ width: `${Math.min(100, (my.hp / 130) * 100)}%` }"></div>
        </div>
      </div>
      <div class="space-y-3 text-xs border-t border-slate-800 pt-4 text-slate-400">
        <div class="flex justify-between"><span>🛡️ 防卫:</span> <span>{{ my.armor?.name }}</span></div>
        <div class="flex justify-between"><span>🎒 武器:</span> <span>{{ my.weapon?.name }}</span></div>
        <div class="flex justify-between items-center"><span>🧪 状态:</span> <span>{{ my.status }}</span></div>
      </div>
    </div>

    <!-- 战报大厅 & 动作 -->
    <div class="lg:col-span-4 flex flex-col justify-between space-y-4">
      <div
          class="bg-slate-950 border border-slate-900 rounded-xl p-4 flex-grow flex flex-col justify-between shadow-inner">
        <div>
          <div class="text-center text-[10px] font-black text-slate-500 mb-3 tracking-widest uppercase">
            第 {{ gameData.state.turn_count }} 回合推演
          </div>
          <div
              class="text-xs text-slate-300 bg-slate-900/20 p-4 rounded-lg border border-slate-900 max-h-[220px] overflow-y-auto font-sans leading-relaxed">
            {{ gameData.combat_log || "等待双方首发行动..." }}
          </div>
        </div>

        <div v-if="gameData.game_over"
             class="mt-4 p-4 bg-slate-900/80 border border-slate-800 rounded-lg text-center animate-fade-in shadow-md">
          <p class="text-rose-400 font-black mb-3">⚔️ 对局已结束 ⚔️</p>
          <button @click="$emit('reset')"
                  class="w-full py-2.5 bg-slate-800 hover:bg-slate-700 rounded text-white font-bold transition cursor-pointer">
            离开房间 (返回大厅)
          </button>
        </div>
      </div>

      <div v-if="!gameData.game_over" class="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
        <div class="grid grid-cols-2 gap-2.5">
          <button @click="$emit('action', '0')"
                  class="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-bold text-rose-400 cursor-pointer transition">
            ⚔️ 基础普攻
          </button>
          <button @click="$emit('action', '9')"
                  class="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-bold text-emerald-400 cursor-pointer transition">
            🛡️ 战术防卫
          </button>
          <button v-for="skill in my.weapon?.skills" :key="skill.id" @click="$emit('action', skill.id)"
                  :disabled="my.mp < skill.cost"
                  class="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 disabled:opacity-30 rounded-lg text-xs font-bold text-sky-400 cursor-pointer transition">
            ✨ {{ skill.name }} (蓝{{ skill.cost }})
          </button>
          <button v-if="my.item" @click="$emit('action', 'i')" :disabled="(my.item_count ?? 0) <= 0"
                  class="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 disabled:opacity-30 rounded-lg text-xs font-bold text-amber-400 cursor-pointer transition">
            🧪 用 {{ my.item?.name }} (剩{{ my.item_count }})
          </button>
        </div>
      </div>
    </div>

    <!-- 敌方面板 -->
    <div
        class="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-xl animate-fade-in">
      <div class="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
        <span
            class="text-[10px] px-2.5 py-0.5 bg-amber-950/30 text-amber-400 rounded-full border border-amber-500/20 font-bold tracking-wider">对手</span>
        <span class="text-lg font-black text-amber-400">{{ enemy.class?.name || '未知敌人' }}</span>
      </div>
      <div class="space-y-1.5 mb-4">
        <div class="flex justify-between text-xs font-bold"><span class="text-rose-500">❤️ HP</span><span
            class="text-rose-400">{{ enemy.hp }}</span></div>
        <div class="w-full h-4 bg-slate-950 rounded-full overflow-hidden p-[2px] border border-slate-850">
          <div class="bg-rose-600 h-full rounded-full transition-all duration-500"
               :style="{ width: `${Math.min(100, (enemy.hp / 130) * 100)}%` }"></div>
        </div>
      </div>
      <div class="space-y-3 text-xs border-t border-slate-800 pt-4 text-slate-400">
        <div class="flex justify-between"><span>🛡️ 防卫:</span> <span>{{ enemy.armor?.name || '?' }}</span></div>
        <div class="flex justify-between"><span>🎒 武器:</span> <span>{{ enemy.weapon?.name || '?' }}</span></div>
        <div class="flex justify-between items-center"><span>🧪 状态:</span> <span>{{ enemy.status || '?' }}</span></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  gameData: any;
  my: any;
  enemy: any;
}>();

defineEmits(['action', 'reset']);
</script>