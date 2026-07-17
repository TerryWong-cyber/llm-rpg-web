import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicRoot = path.join(projectRoot, 'public')
const vendorRoot = path.join(publicRoot, 'assets', 'vendor', 'game-icons')
const manifestPath = path.join(publicRoot, 'assets', 'licenses', 'assets.manifest.json')
const supportedExtensions = new Set(['.svg', '.png', '.webp', '.avif'])

function toPublicPath(filePath) {
  return `/${path.relative(publicRoot, filePath).split(path.sep).join('/')}`
}

async function collectAssetFiles(directory) {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    throw error
  }

  const files = []
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectAssetFiles(entryPath))
    } else if (supportedExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(toPublicPath(entryPath))
    }
  }
  return files
}

function parseGameIconsSource(value) {
  try {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase()
    const segments = url.pathname.split('/').filter(Boolean)
    if (url.protocol !== 'https:'
      || (hostname !== 'game-icons.net' && hostname !== 'www.game-icons.net')
      || segments.length < 2) return null
    const authorSlug = segments[0] === '1x1' ? segments[1] : segments[0]
    const sourceFile = segments.at(-1)
    if (!authorSlug || !sourceFile?.endsWith('.html')) return null
    return { authorSlug: authorSlug.toLowerCase(), sourceFile: sourceFile.toLowerCase() }
  } catch {
    return null
  }
}

const errors = []
let manifest

try {
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
} catch (error) {
  console.error(`无法读取素材许可清单 ${manifestPath}: ${error.message}`)
  process.exit(1)
}

if (manifest.schema_version !== '1.0') errors.push('schema_version 必须为 "1.0"。')
if (!manifest.licenses || typeof manifest.licenses !== 'object') errors.push('licenses 必须是对象。')
if (!Array.isArray(manifest.assets)) errors.push('assets 必须是数组。')

const licenses = manifest.licenses ?? {}
const assets = Array.isArray(manifest.assets) ? manifest.assets : []
const manifestPaths = new Set()

for (const [index, asset] of assets.entries()) {
  const label = `assets[${index}]`
  if (!asset || typeof asset !== 'object') {
    errors.push(`${label} 必须是对象。`)
    continue
  }

  if (typeof asset.path !== 'string' || !asset.path.startsWith('/assets/vendor/game-icons/')) {
    errors.push(`${label}.path 必须位于 /assets/vendor/game-icons/。`)
  } else if (manifestPaths.has(asset.path)) {
    errors.push(`${label}.path 重复：${asset.path}`)
  } else {
    manifestPaths.add(asset.path)
  }

  for (const field of ['title', 'author']) {
    if (typeof asset[field] !== 'string' || !asset[field].trim()) {
      errors.push(`${label}.${field} 不能为空。`)
    }
  }

  const source = parseGameIconsSource(asset.source_url)
  if (!source) {
    errors.push(`${label}.source_url 必须是对应图标的 Game-icons HTTPS 页面，不能只填首页。`)
  } else if (typeof asset.path === 'string') {
    const pathSegments = asset.path.split('/').filter(Boolean)
    const authorDirectory = pathSegments[3]?.toLowerCase()
    const assetFile = pathSegments.at(-1)?.toLowerCase().replace(/\.(svg|png|webp|avif)$/, '.html')
    if (authorDirectory !== source.authorSlug) {
      errors.push(`${label} 的作者目录 ${authorDirectory ?? '(缺失)'} 与原始页面作者 ${source.authorSlug} 不一致。`)
    }
    if (assetFile !== source.sourceFile) {
      errors.push(`${label} 的文件名与原始页面 ${source.sourceFile} 不一致。`)
    }
  }
  if (typeof asset.license !== 'string' || !licenses[asset.license]) {
    errors.push(`${label}.license 必须引用 licenses 中已声明的许可证。`)
  }
  if (typeof asset.modified !== 'boolean') {
    errors.push(`${label}.modified 必须是布尔值。`)
  }
  if (asset.modified === true && (typeof asset.modifications !== 'string' || !asset.modifications.trim())) {
    errors.push(`${label}.modifications 必须说明对素材做过哪些修改。`)
  }
}

const physicalFiles = new Set(await collectAssetFiles(vendorRoot))
for (const filePath of physicalFiles) {
  if (!manifestPaths.has(filePath)) errors.push(`素材未登记许可信息：${filePath}`)
}
for (const filePath of manifestPaths) {
  if (!physicalFiles.has(filePath)) errors.push(`许可清单引用了不存在的素材：${filePath}`)
}

if (errors.length > 0) {
  console.error('第三方素材许可校验失败：')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`第三方素材许可校验通过：已登记 ${assets.length} 个 Game-icons 素材。`)
