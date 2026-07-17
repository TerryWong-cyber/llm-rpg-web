<template>
  <section class="combat-stage battle-stage">
    <header class="battle-header">
      <div><p class="eyebrow">{{ snapshot.state.game_mode }} · TURN {{ snapshot.state.turn_count }}</p><h1>{{ snapshot.state.environment || '无名战场' }}</h1></div>
      <span v-if="combat.waitingForSnapshot.value" class="waiting-seal"><i class="spinner" /> 等待服务器快照</span>
      <button v-else class="button button--ghost" type="button" @click="combat.leaveRoom">退出房间</button>
    </header>

    <div class="battle-board">
      <article class="combatant-card combatant-card--player">
        <div class="combatant-card__identity"><span>你</span><div><p class="eyebrow">TRAVELER</p><h2>{{ me?.class?.name || '未知职业' }}</h2><small>{{ me?.status || '状态正常' }}</small></div></div>
        <StatBar label="生命" :value="me?.hp ?? 0" :maximum="maxHealth(me)" tone="health" />
        <StatBar label="法力" :value="me?.mp ?? 0" :maximum="me?.class?.mp ?? 0" tone="mana" />
        <dl><div><dt>武器</dt><dd>{{ me?.weapon?.name || '无' }}</dd></div><div><dt>护甲</dt><dd>{{ me?.armor?.name || '无' }}</dd></div><div><dt>药剂</dt><dd>{{ me?.item?.name || '无' }} <template v-if="me?.item">×{{ me.itemCount }}</template></dd></div></dl>
      </article>

      <article class="battle-ledger panel">
        <header><p class="eyebrow">BATTLE CHRONICLE</p><h2>战斗纪事</h2></header>
        <pre>{{ snapshot.combat_log || '战场尚未留下新的记录。' }}</pre>

        <div v-if="snapshot.game_over" class="battle-finished">
          <span>✦</span><h3>战斗已经结束</h3><p>{{ snapshot.reward_summary || '最终快照已同步金币与行囊。返回营地后可继续探索。' }}</p>
          <button class="button button--primary" type="button" @click="combat.leaveRoom">返回冒险营地</button>
        </div>

        <div v-else class="action-grid">
          <button type="button" :disabled="actionsDisabled" @click="combat.submitAction('0')"><span>⚔</span><strong>普通攻击</strong><small>稳定的基础动作</small></button>
          <button type="button" :disabled="actionsDisabled" @click="combat.submitAction('9')"><span>◈</span><strong>战术防御</strong><small>稳住当前阵势</small></button>
          <button v-for="skill in me?.weapon?.skills" :key="skill.id" type="button" :disabled="actionsDisabled || (me?.mp ?? 0) < skill.cost" @click="combat.submitAction(skill.id)">
            <span>✧</span><strong>{{ skill.name }}</strong><small>消耗 {{ skill.cost }} 法力</small>
          </button>
          <button v-if="me?.item" type="button" :disabled="actionsDisabled || me.itemCount <= 0" @click="combat.submitAction('i')"><span>⚗</span><strong>{{ me.item.name }}</strong><small>剩余 {{ me.itemCount }}</small></button>
        </div>
      </article>

      <article class="combatant-card combatant-card--enemy">
        <div class="combatant-card__identity"><span>{{ snapshot.monster_enemy?.emoji || (snapshot.npc_enemy ? snapshot.npc_enemy.name.slice(0, 1) : '敌') }}</span><div><p class="eyebrow">{{ snapshot.monster_enemy?.title || snapshot.npc_enemy?.title || 'OPPONENT' }}</p><h2>{{ snapshot.monster_enemy?.name || snapshot.npc_enemy?.name || enemy?.class?.name || '未知敌人' }}</h2><small>{{ enemy?.status || '状态未知' }}</small></div></div>
        <StatBar label="生命" :value="enemy?.hp ?? 0" :maximum="maxHealth(enemy)" tone="health" />
        <StatBar label="法力" :value="enemy?.mp ?? 0" :maximum="enemy?.class?.mp ?? 0" tone="mana" />
        <dl><div><dt>武器</dt><dd>{{ enemy?.weapon?.name || '未知' }}</dd></div><div><dt>护甲</dt><dd>{{ enemy?.armor?.name || '未知' }}</dd></div><div v-if="snapshot.npc_enemy || snapshot.monster_enemy"><dt>威胁</dt><dd>{{ snapshot.monster_enemy?.combat.threat ?? snapshot.npc_enemy?.combat_threat ?? '未知' }}</dd></div></dl>
        <p v-if="snapshot.monster_enemy" class="combatant-card__description">{{ snapshot.monster_enemy.description }}</p>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CombatantView, CombatSnapshot } from '../../contracts'
import StatBar from '../../components/ui/StatBar.vue'
import { useCombatStore } from '../../stores/combat'

defineProps<{ snapshot: CombatSnapshot }>()
const combat = useCombatStore()
const me = combat.me
const enemy = combat.enemy
const actionsDisabled = computed(() => combat.waitingForSnapshot.value || combat.snapshot.value?.next_node !== 'PlayerAction')

function maxHealth(combatant: CombatantView | null): number {
  return (combatant?.class?.hp ?? 0) + (combatant?.armor?.hp_bonus ?? 0)
}
</script>
