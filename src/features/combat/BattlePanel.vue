<template>
  <section class="combat-stage battle-stage">
    <header class="battle-header">
      <div>
        <p class="eyebrow">{{ snapshot.state.game_mode }} · TURN {{ snapshot.state.turn_count }}</p>
        <h1>{{ snapshot.state.environment || '无名战场' }}</h1>
        <p v-if="snapshot.state.environment_context.tags.length" class="environment-tags">
          <span v-for="tag in snapshot.state.environment_context.tags" :key="tag">{{ tag }}</span>
        </p>
      </div>
      <span v-if="combat.waitingForSnapshot.value" class="waiting-seal"><i class="spinner" /> 等待服务器快照</span>
      <button v-else class="button button--ghost" type="button" @click="combat.leaveRoom">退出房间</button>
    </header>

    <div class="battle-board">
      <article class="combatant-card combatant-card--player">
        <div class="combatant-card__identity"><span>你</span><div><p class="eyebrow">TRAVELER</p><h2>{{ me?.race?.name || me?.class?.name || '未知旅人' }}</h2><small>{{ me?.status || '状态正常' }}</small></div></div>
        <StatBar label="生命" :value="me?.hp ?? 0" :maximum="me?.maxHp ?? 0" tone="health" />
        <StatBar label="法力" :value="me?.mp ?? 0" :maximum="me?.maxMp ?? 0" tone="mana" />
        <StatBar label="精力" :value="me?.stamina ?? 0" :maximum="me?.maxStamina ?? 0" tone="stamina" />
        <div v-if="me?.statuses.length" class="status-list">
          <span v-for="status in me.statuses" :key="status.status_id" class="status-chip" :title="`来源 ${status.source_id}`">
            {{ status.name }}<b v-if="status.stacks > 1">×{{ status.stacks }}</b><small>{{ status.remaining_turns }}回合</small>
          </span>
        </div>
        <dl>
          <div><dt>武器</dt><dd>{{ me?.weapon?.name || '无' }}</dd></div><div><dt>护甲</dt><dd>{{ me?.armor?.name || '无' }}</dd></div><div><dt>战斗道具</dt><dd>从行囊即时选取</dd></div>
          <div><dt>物抗 / 法抗</dt><dd>{{ rounded(me?.stats?.physical_resistance) }} / {{ rounded(me?.stats?.magic_resistance) }}</dd></div>
          <div><dt>命中 / 闪避</dt><dd>{{ rounded(me?.stats?.accuracy) }} / {{ rounded(me?.stats?.evasion) }}</dd></div>
        </dl>
      </article>

      <article class="battle-ledger panel">
        <header><p class="eyebrow">BATTLE CHRONICLE</p><h2>战斗纪事</h2></header>

        <div v-if="myResolution && enemyResolution" class="resolution-grid">
          <section class="resolution-card resolution-card--mine">
            <header><strong>你的效果判定</strong><b>{{ myResolution.effectiveness.score }}/10</b></header>
            <p>{{ myResolution.effectiveness.reason }}</p>
            <small>{{ damageSummary(myResolution.damage) }}</small>
            <small v-if="incomingExtra(myResolution)">承受持续/环境伤害 {{ incomingExtra(myResolution) }}</small>
          </section>
          <section class="resolution-card resolution-card--enemy">
            <header><strong>对手效果判定</strong><b>{{ enemyResolution.effectiveness.score }}/10</b></header>
            <p>{{ enemyResolution.effectiveness.reason }}</p>
            <small>{{ damageSummary(enemyResolution.damage) }}</small>
            <small v-if="incomingExtra(enemyResolution)">承受持续/环境伤害 {{ incomingExtra(enemyResolution) }}</small>
          </section>
        </div>

        <pre>{{ snapshot.combat_log || '战场尚未留下新的记录。' }}</pre>

        <div v-if="snapshot.game_over" class="battle-finished">
          <span>✦</span><h3>战斗已经结束</h3><p>{{ snapshot.reward_summary || '最终资源与持续状态已经同步到旅人档案。' }}</p>
          <button class="button button--primary" type="button" @click="combat.leaveRoom">返回冒险营地</button>
        </div>

        <div v-else class="action-grid">
          <button type="button" :disabled="actionsDisabled" @click="combat.submitAction('0')"><span>⚔</span><strong>普通攻击</strong><small>不消耗资源</small></button>
          <button type="button" :disabled="actionsDisabled" @click="combat.submitAction('9')"><span>◈</span><strong>战术防御</strong><small>显著削弱对手攻击</small></button>
          <button v-for="skill in me?.skills" :key="skill.id" class="race-action" type="button" :disabled="actionsDisabled || !canUseSkill(skill)" :title="skill.description" @click="combat.submitAction(skill.id)">
            <ItemIcon class="battle-skill-icon" :image-url="skill.icon_url" fallback="✧" /><strong>{{ skill.name }}</strong><small>{{ skillCostLabel(skill) }}</small>
          </button>
          <button type="button" :disabled="actionsDisabled" @click="showItems = true"><span>⚗</span><strong>使用物品</strong><small>{{ combatItems.length }} 种可用</small></button>
        </div>

        <div v-if="showItems" class="battle-item-backdrop" @click.self="showItems = false">
          <section class="battle-item-picker" role="dialog" aria-modal="true" aria-label="选择战斗物品">
            <header><div><p class="eyebrow">COMBAT SATCHEL</p><h3>选择战斗物品</h3></div><button class="icon-button" type="button" aria-label="关闭战斗行囊" @click="showItems = false">×</button></header>
            <div v-if="combatItems.length" class="battle-item-list">
              <button v-for="item in combatItems" :key="item.id" type="button" :disabled="actionsDisabled" @click="useCombatItem(item.id)">
                <ItemIcon class="battle-item-list__icon" :image-url="item.image_url" fallback="⚗" />
                <span><strong>{{ item.name }}</strong><small>{{ item.desc }}</small><em>{{ item.category }} · {{ item.tags.join('、') }}</em></span>
                <b>× {{ item.count }}</b>
              </button>
            </div>
            <div v-else class="empty-state empty-state--compact"><span>◇</span><h3>没有战斗可用物品</h3><p>只有标记为“战斗中”的物品会出现在这里。</p></div>
          </section>
        </div>
      </article>

      <article class="combatant-card combatant-card--enemy">
        <div class="combatant-card__identity"><span>{{ snapshot.monster_enemy?.emoji || (snapshot.npc_enemy ? snapshot.npc_enemy.name.slice(0, 1) : '敌') }}</span><div><p class="eyebrow">{{ snapshot.monster_enemy?.title || snapshot.npc_enemy?.title || 'OPPONENT' }}</p><h2>{{ snapshot.monster_enemy?.name || snapshot.npc_enemy?.name || enemy?.class?.name || '未知敌人' }}</h2><small>{{ enemy?.status || '状态未知' }}</small></div></div>
        <StatBar label="生命" :value="enemy?.hp ?? 0" :maximum="enemy?.maxHp ?? 0" tone="health" />
        <StatBar label="法力" :value="enemy?.mp ?? 0" :maximum="enemy?.maxMp ?? 0" tone="mana" />
        <StatBar label="精力" :value="enemy?.stamina ?? 0" :maximum="enemy?.maxStamina ?? 0" tone="stamina" />
        <div v-if="enemy?.statuses.length" class="status-list">
          <span v-for="status in enemy.statuses" :key="status.status_id" class="status-chip status-chip--enemy">
            {{ status.name }}<b v-if="status.stacks > 1">×{{ status.stacks }}</b><small>{{ status.remaining_turns }}回合</small>
          </span>
        </div>
        <dl>
          <div><dt>武器</dt><dd>{{ enemy?.weapon?.name || '未知' }}</dd></div><div><dt>护甲</dt><dd>{{ enemy?.armor?.name || '未知' }}</dd></div><div v-if="snapshot.npc_enemy || snapshot.monster_enemy"><dt>威胁</dt><dd>{{ snapshot.monster_enemy?.combat.threat ?? snapshot.npc_enemy?.combat_threat ?? '未知' }}</dd></div>
          <div><dt>物抗 / 法抗</dt><dd>{{ rounded(enemy?.stats?.physical_resistance) }} / {{ rounded(enemy?.stats?.magic_resistance) }}</dd></div>
          <div><dt>命中 / 闪避</dt><dd>{{ rounded(enemy?.stats?.accuracy) }} / {{ rounded(enemy?.stats?.evasion) }}</dd></div>
        </dl>
        <p v-if="snapshot.monster_enemy" class="combatant-card__description">{{ snapshot.monster_enemy.description }}</p>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CombatantResolution, CombatSnapshot, DamageBreakdown, SkillDefinition } from '../../contracts'
import ItemIcon from '../../components/ui/ItemIcon.vue'
import StatBar from '../../components/ui/StatBar.vue'
import { useCatalogStore } from '../../stores/catalog'
import { useCombatStore } from '../../stores/combat'
import { usePlayerStore } from '../../stores/player'

const props = defineProps<{ snapshot: CombatSnapshot }>()
const combat = useCombatStore()
const player = usePlayerStore()
const catalog = useCatalogStore()
const showItems = ref(false)
const me = combat.me
const enemy = combat.enemy
const combatItems = computed(() => Object.entries(player.profile.value?.inventory.items ?? {}).flatMap(([id, count]) => {
  const item = catalog.meta.value?.items[id]
  return item && count > 0 && item.use_contexts.includes('combat') ? [{ ...item, count }] : []
}))
const actionsDisabled = computed(() => combat.waitingForSnapshot.value || combat.snapshot.value?.next_node !== 'PlayerAction')
const isSecondPlayer = computed(() => props.snapshot.state.p2_id === player.playerId.value)
const resolution = computed(() => (
  'player' in props.snapshot.last_resolution ? props.snapshot.last_resolution : null
))
const myResolution = computed<CombatantResolution | null>(() => {
  if (!resolution.value) return null
  return isSecondPlayer.value ? resolution.value.opponent : resolution.value.player
})
const enemyResolution = computed<CombatantResolution | null>(() => {
  if (!resolution.value) return null
  return isSecondPlayer.value ? resolution.value.player : resolution.value.opponent
})

function rounded(value?: number): number {
  return Math.round(value ?? 0)
}

function canUseSkill(skill: SkillDefinition): boolean {
  return (me.value?.mp ?? 0) >= (skill.costs?.mp ?? skill.cost ?? 0)
    && (me.value?.stamina ?? 0) >= (skill.costs?.stamina ?? 0)
}

function skillCostLabel(skill: SkillDefinition): string {
  const costs = skill.costs ?? { mp: skill.cost ?? 0 }
  const labels = [costs.mp ? `${costs.mp} 魔力` : '', costs.stamina ? `${costs.stamina} 精力` : '', costs.hp ? `${costs.hp} 生命` : ''].filter(Boolean)
  return labels.length ? `消耗 ${labels.join(' / ')}` : '无消耗'
}

function damageSummary(damage: DamageBreakdown): string {
  if (!damage.hit) return `未命中 · 命中率 ${Math.round(damage.hit_chance * 100)}%`
  const parts = [
    damage.physical ? `物理 ${damage.physical}` : '',
    damage.magical ? `法术 ${damage.magical}` : '',
    ...Object.entries(damage.elemental).filter(([, value]) => value > 0).map(([element, value]) => `${element} ${value}`),
    damage.true ? `真实 ${damage.true}` : '',
  ].filter(Boolean)
  return `${damage.critical ? '暴击 · ' : ''}总伤害 ${damage.total}${parts.length ? `（${parts.join(' / ')}）` : ''}`
}

function incomingExtra(value: CombatantResolution): number {
  return value.status_damage_received.total + value.environment_damage_received.total
}

function useCombatItem(itemId: string): void {
  combat.submitAction('i', itemId)
  showItems.value = false
}
</script>
