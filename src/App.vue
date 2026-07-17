<template>
  <div class="app-shell">
    <div class="ambient ambient--one" /><div class="ambient ambient--two" />
    <header class="app-header">
      <a class="brand" href="#" aria-label="远境旅人志首页" @click.prevent="hubTab = 'explore'">
        <span class="brand__sigil">✦</span><span><strong>远境旅人志</strong><small>WAYFARER CHRONICLE</small></span>
      </a>
      <div v-if="player.hasSession.value" class="header-profile">
        <ItemIcon class="header-profile__avatar item-icon--portrait" :image-url="playerAvatarUrl" :fallback="playerInitial" />
        <span class="header-profile__identity">
          <strong class="header-profile__name">{{ player.profile.value?.name }}</strong>
          <small>{{ playerCharacterName }}</small>
        </span>
        <span class="header-profile__gold">◈ {{ player.profile.value?.gold ?? 0 }}</span>
        <button class="button button--quiet" type="button" @click="restartSession">新建旅程</button>
      </div>
      <span v-else class="header-version">SERVER CONTRACT 3.0</span>
    </header>

    <FeedbackBanner />

    <main class="app-main">
      <div v-if="catalog.loading.value && !catalog.ready.value" class="boot-screen">
        <span class="boot-screen__sigil">✦</span><p class="eyebrow">OPENING THE CHRONICLE</p><h1>正在读取远境目录</h1><div class="boot-line"><i /></div>
      </div>

      <section v-else-if="!catalog.ready.value" class="fatal-state panel">
        <span>×</span><h1>远境目录暂时无法打开</h1><p>请确认游戏服务器已经启动，并检查当前环境中的 API 地址。</p><button class="button button--primary" type="button" @click="catalog.loadCatalog(true)">重新连接</button>
      </section>

      <CharacterCreate
        v-else-if="!player.hasSession.value"
        :meta="catalog.meta.value"
        :busy="player.busy.value"
        @create="createCharacter"
      />

      <template v-else>
        <PrepPanel
          v-if="combat.snapshot.value && !combat.snapshot.value.game_over && combat.snapshot.value.next_node === 'PlayerPrep'"
          :snapshot="combat.snapshot.value"
          :meta="catalog.meta.value!"
        />
        <BattlePanel v-else-if="combat.snapshot.value" :snapshot="combat.snapshot.value" />
        <HubPage v-else v-model="hubTab" />
      </template>
    </main>

    <footer class="app-footer">
      <span>✦</span>
      <p>服务器是金币、行囊、地图、关系与战斗结果的唯一事实来源。</p>
      <button class="app-footer__link" type="button" @click="showAssetCredits = true">素材与许可</button>
      <span>✦</span>
    </footer>

    <AssetCreditsModal v-if="showAssetCredits" @close="showAssetCredits = false" />

    <div v-if="notifications.sessionIssue.value" class="modal-backdrop">
      <section class="modal modal--small" role="alertdialog" aria-modal="true" aria-labelledby="session-title">
        <p class="eyebrow">SESSION NO LONGER FOUND</p><h2 id="session-title">这段旅程可能已经消散</h2>
        <p>服务器没有找到当前玩家档案。后端重启会清空内存数据；本地缓存只能帮助页面刷新，不能恢复已被服务器清除的档案。</p>
        <div class="modal__actions"><button class="button button--ghost" type="button" @click="notifications.clearSessionIssue">暂时保留</button><button class="button button--primary" type="button" @click="restartSession">建立新旅程</button></div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import FeedbackBanner from './components/ui/FeedbackBanner.vue'
import ItemIcon from './components/ui/ItemIcon.vue'
import BattlePanel from './features/combat/BattlePanel.vue'
import PrepPanel from './features/combat/PrepPanel.vue'
import CharacterCreate from './features/character/CharacterCreate.vue'
import HubPage, { type HubTab } from './features/hub/HubPage.vue'
import AssetCreditsModal from './features/legal/AssetCreditsModal.vue'
import { useCatalogStore } from './stores/catalog'
import { useCombatStore } from './stores/combat'
import { useExplorationStore } from './stores/exploration'
import { useNotificationsStore } from './stores/notifications'
import { usePlayerStore } from './stores/player'
import { useWorldStore } from './stores/world'

const catalog = useCatalogStore()
const player = usePlayerStore()
const combat = useCombatStore()
const exploration = useExplorationStore()
const world = useWorldStore()
const notifications = useNotificationsStore()
const hubTab = ref<HubTab>('explore')
const showAssetCredits = ref(false)
const playerCharacter = computed(() => {
  const id = player.profile.value?.character_id
  return id ? catalog.meta.value?.characters[id] : undefined
})
const playerAvatarUrl = computed(() => playerCharacter.value?.image_url ?? '')
const playerCharacterName = computed(() => playerCharacter.value?.name ?? '未记录的旅人')
const playerInitial = computed(() => player.profile.value?.name?.slice(0, 1) || '旅')

async function createCharacter(payload: { name: string; characterId: string }): Promise<void> {
  if (await player.create(payload.name, payload.characterId)) hubTab.value = 'explore'
}

function restartSession(): void {
  combat.leaveRoom()
  exploration.resetExploration()
  world.resetWorld()
  player.clearSession()
  notifications.clear()
  hubTab.value = 'explore'
}

watch(() => combat.snapshot.value?.game_over, async (gameOver, previous) => {
  if (gameOver && !previous && world.selectedNpc.value) {
    await world.selectNpc(world.selectedNpc.value.npc_id, true)
    hubTab.value = 'npcs'
  }
})

onMounted(async () => {
  player.restoreSession()
  await catalog.loadCatalog()
  if (player.restoredFromCache.value) {
    notifications.show('已从本机恢复最近的旅人档案；服务器重启后该档案可能失效。', 'info')
  }
})

onBeforeUnmount(() => combat.leaveRoom())
</script>
