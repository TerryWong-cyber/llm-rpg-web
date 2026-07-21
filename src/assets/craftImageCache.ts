import { shallowRef } from 'vue'
import { resolveOssFileUrl } from '../api/config'

const CACHE_NAME = 'llm-rpg-crafted-images-v1'
const localUrls = shallowRef<Record<string, string>>({})
const pendingKeys = new Set<string>()

/**
 * Resolve an OSS object key to a display URL and asynchronously persist it in
 * Cache Storage. CORS failures deliberately fall back to the public OSS URL.
 */
export function imageUrlFor(imageUrl?: string, imageKey?: string): string {
  if (!imageKey) return imageUrl || ''
  const cachedUrl = localUrls.value[imageKey]
  if (cachedUrl) return cachedUrl
  void cacheCraftedImage(imageKey)
  return resolveOssFileUrl(imageKey) || imageUrl || ''
}

async function cacheCraftedImage(imageKey: string): Promise<void> {
  if (pendingKeys.has(imageKey) || localUrls.value[imageKey] || !('caches' in window)) return
  const remoteUrl = resolveOssFileUrl(imageKey)
  if (!remoteUrl) return
  pendingKeys.add(imageKey)
  try {
    const cache = await window.caches.open(CACHE_NAME)
    let response = await cache.match(remoteUrl)
    if (!response) {
      const fetched = await fetch(remoteUrl, { mode: 'cors' })
      if (!fetched.ok) return
      await cache.put(remoteUrl, fetched.clone())
      response = fetched
    }
    const blob = await response.blob()
    if (!blob.size) return
    localUrls.value = { ...localUrls.value, [imageKey]: URL.createObjectURL(blob) }
  } catch {
    // The public image URL remains usable when OSS does not grant browser CORS.
  } finally {
    pendingKeys.delete(imageKey)
  }
}
