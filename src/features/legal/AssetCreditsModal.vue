<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <section
      class="modal asset-credits"
      role="dialog"
      aria-modal="true"
      aria-labelledby="asset-credits-title"
    >
      <header>
        <div>
          <p class="eyebrow">ASSETS &amp; LICENSES</p>
          <h2 id="asset-credits-title">素材与许可</h2>
        </div>
        <button class="icon-button" type="button" aria-label="关闭素材与许可" @click="emit('close')">×</button>
      </header>

      <p class="asset-credits__intro">
        游戏使用的第三方图标会在这里逐项署名，并保留原始来源、许可证与修改说明。
      </p>

      <p v-if="loading" class="asset-credits__state">正在读取素材清单……</p>
      <p v-else-if="error" class="asset-credits__state asset-credits__state--error">{{ error }}</p>
      <p v-else-if="!manifest?.assets.length" class="asset-credits__state">
        当前还没有登记进游戏的 Game-icons 素材。
      </p>

      <div v-else class="asset-credits__list">
        <article v-for="asset in manifest.assets" :key="asset.path" class="asset-credit">
          <div>
            <h3>{{ asset.title }}</h3>
            <p>图标作者：{{ asset.author }} · Game-icons.net</p>
            <small v-if="asset.modified">已修改：{{ asset.modifications }}</small>
            <small v-else>未修改</small>
          </div>
          <div class="asset-credit__links">
            <a :href="asset.source_url" target="_blank" rel="noreferrer">原始页面</a>
            <a :href="licenseUrl(asset.license)" target="_blank" rel="noreferrer">{{ asset.license }}</a>
          </div>
        </article>
      </div>

      <footer class="asset-credits__notice">
        <p>
          Game-icons.net 图标依据
          <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a>
          使用。该许可允许复制、修改和商业使用，但须保留适当署名、许可证链接并说明修改。
        </p>
        <a href="https://game-icons.net/about.html" target="_blank" rel="noreferrer">查看 Game-icons 官方许可说明</a>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

interface AssetLicense {
  name: string
  url: string
  legal_code_url: string
}

interface LicensedAsset {
  path: string
  title: string
  author: string
  source_url: string
  license: string
  modified: boolean
  modifications?: string
}

interface AssetManifest {
  licenses: Record<string, AssetLicense>
  assets: LicensedAsset[]
}

const emit = defineEmits<{ close: [] }>()
const manifest = ref<AssetManifest | null>(null)
const loading = ref(true)
const error = ref('')

function licenseUrl(licenseId: string): string {
  return manifest.value?.licenses[licenseId]?.url ?? 'https://creativecommons.org/licenses/by/3.0/'
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('close')
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}assets/licenses/assets.manifest.json`, {
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    manifest.value = await response.json() as AssetManifest
  } catch (cause) {
    console.error('Failed to load asset license manifest', cause)
    error.value = '素材许可清单暂时无法读取。'
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>
