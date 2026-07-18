<template>
  <section class="feature-stack">
    <div class="feature-toolbar">
      <small>房间断线后会立即失效</small>
      <span class="connection-pill" :class="`connection-pill--${combat.connectionStatus.value}`">{{ connectionLabel }}</span>
    </div>

    <article v-if="combat.roomId.value" class="room-ticket panel">
      <p class="eyebrow">ROOM INSCRIPTION</p>
      <h3>房间已建立</h3>
      <div class="room-code">{{ combat.roomId.value }}</div>
      <p>{{ combat.snapshot.value ? '战斗快照已就绪，正在进入战场。' : '连接已保持，等待另一位旅人加入。' }}</p>
      <button class="button button--ghost" type="button" @click="combat.leaveRoom">离开并销毁房间</button>
    </article>

    <div v-else class="room-options">
      <article class="mode-card mode-card--pve">
        <span class="mode-card__number">01</span><div class="mode-card__sigil">♜</div>
        <p class="eyebrow">SOLO EXPEDITION</p><h3>独行试炼</h3>
        <p>服务器会直接读取角色页面中的当前装备并进入战斗。</p>
        <button class="button button--primary" type="button" :disabled="busy" @click="startPve">{{ busy ? '正在布置战场…' : '开始 PvE 试炼' }}</button>
      </article>

      <article class="mode-card mode-card--pvp">
        <span class="mode-card__number">02</span><div class="mode-card__sigil">⚔</div>
        <p class="eyebrow">TRAVELER'S DUEL</p><h3>旅人决斗</h3>
        <p>创建房间并分享编号，或输入同行者发来的房间编号。</p>
        <div class="duel-actions">
          <button class="button button--dark" type="button" :disabled="busy" @click="createPvp">创建 PvP 房间</button>
          <span>或</span>
          <form @submit.prevent="joinPvp"><input v-model.trim="joinCode" aria-label="房间编号" placeholder="输入房间编号" /><button class="button button--gold" type="submit" :disabled="busy || !joinCode">加入</button></form>
        </div>
      </article>
    </div>

    <div class="protocol-note"><span>✦</span><p><strong>实时协议提示</strong> 提交准备或战斗动作后，界面会等待服务器的新快照；“已接收”事件不会提前推动回合。</p></div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCombatStore } from '../../stores/combat'

const combat = useCombatStore()
const joinCode = ref('')
const busy = computed(() => combat.connectionStatus.value === 'connecting')
const connectionLabel = computed(() => ({
  disconnected: '未连接', connecting: '连接中', connected: '实时连接已建立',
})[combat.connectionStatus.value])

async function startPve(): Promise<void> { await combat.startPve() }
async function createPvp(): Promise<void> { await combat.createPvp() }
async function joinPvp(): Promise<void> {
  if (await combat.joinPvp(joinCode.value)) joinCode.value = ''
}
</script>
