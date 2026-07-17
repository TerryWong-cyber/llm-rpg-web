import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = process.argv[2]

if (!sourceRoot) {
  console.error('用法：node scripts/import-world-icons.mjs <game-icons 官方仓库目录>')
  process.exit(1)
}

const assets = [
  ['delapouite', 'circle-forest', 'Circle forest'],
  ['lorc', 'mountains', 'Mountains'],
  ['lorc', 'waves', 'Waves'],
  ['delapouite', 'grass', 'Grass'],
  ['delapouite', 'desert', 'Desert'],
  ['delapouite', 'cave-entrance', 'Cave entrance'],
  ['delapouite', 'mine-wagon', 'Mine wagon'],
  ['delapouite', 'river', 'River'],
  ['delapouite', 'village', 'Village'],
  ['delapouite', 'castle', 'Castle'],
  ['delapouite', 'forest', 'Forest'],
  ['delapouite', 'ancient-ruins', 'Ancient ruins'],
  ['delapouite', 'road', 'Road'],
  ['delapouite', 'swamp', 'Swamp'],
  ['lorc', 'snowflake-2', 'Snowflake 2'],
  ['delapouite', 'oasis', 'Oasis'],
  ['delapouite', 'graveyard', 'Graveyard'],
  ['lorc', 'volcano', 'Volcano'],
  ['delapouite', 'island', 'Island'],
  ['delapouite', 'waterfall', 'Waterfall'],
  ['delapouite', 'berry-bush', 'Berry bush'],
  ['delapouite', 'animal-hide', 'Animal hide'],
  ['delapouite', 'coal-pile', 'Coal pile'],
  ['delapouite', 'mineral-pearls', 'Mineral pearls'],
  ['delapouite', 'coral', 'Coral'],
  ['delapouite', 'algae', 'Algae'],
  ['delapouite', 'palm-tree', 'Palm tree'],
  ['delapouite', 'amber-mosquito', 'Amber mosquito'],
  ['delapouite', 'wool', 'Wool'],
  ['delapouite', 'reed', 'Reed'],
  ['delapouite', 'oyster-pearl', 'Oyster pearl'],
  ['delapouite', 'ice-cubes', 'Ice cubes'],
  ['delapouite', 'fire-gem', 'Fire gem'],
  ['delapouite', 'flying-beetle', 'Flying beetle'],
  ['lorc', 'honeycomb', 'Honeycomb'],
  ['lorc', 'crossed-bones', 'Crossed bones'],
  ['lorc', 'feather', 'Feather'],
  ['lorc', 'bat-wing', 'Bat wing'],
  ['lorc', 'crab', 'Crab'],
  ['lorc', 'scorpion-tail', 'Scorpion tail'],
  ['lorc', 'ghost', 'Ghost'],
  ['lorc', 'rune-stone', 'Rune stone'],
  ['lorc', 'powder', 'Powder'],
  ['lorc', 'spiral-shell', 'Spiral shell'],
  ['lorc', 'salt-shaker', 'Salt shaker'],
  ['faithtoken', 'ore', 'Ore'],
]

const authorNames = {
  delapouite: 'Delapouite',
  faithtoken: 'Faithtoken',
  lorc: 'Lorc',
}

const publicRoot = path.join(projectRoot, 'public')
const vendorRoot = path.join(publicRoot, 'assets', 'vendor', 'game-icons')
const manifestPath = path.join(publicRoot, 'assets', 'licenses', 'assets.manifest.json')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const importedPaths = new Set()

for (const [author, slug, title] of assets) {
  const sourcePath = path.join(sourceRoot, author, `${slug}.svg`)
  const destinationDirectory = path.join(vendorRoot, author)
  const destinationPath = path.join(destinationDirectory, `${slug}.svg`)
  await mkdir(destinationDirectory, { recursive: true })
  await copyFile(sourcePath, destinationPath)

  const original = await readFile(destinationPath, 'utf8')
  const themed = original
    .replace('<path d="M0 0h512v512H0z"/>', '')
    .replaceAll('fill="#fff"', 'fill="#f7f3e8"')
  if (themed === original || themed.includes('<path d="M0 0h512v512H0z"/>')) {
    throw new Error(`无法安全转换 SVG 背景：${author}/${slug}.svg`)
  }
  await writeFile(destinationPath, themed)

  const publicPath = `/assets/vendor/game-icons/${author}/${slug}.svg`
  importedPaths.add(publicPath)
  manifest.assets.push({
    path: publicPath,
    title,
    author: authorNames[author],
    source_url: `https://game-icons.net/1x1/${author}/${slug}.html`,
    license: 'CC-BY-3.0',
    modified: true,
    modifications: '移除默认黑色背景，并将前景调整为适配地图色块的米白色；未改变图形轮廓。',
  })
}

manifest.assets = manifest.assets
  .filter((asset, index, all) => !importedPaths.has(asset.path)
    || index === all.findLastIndex((candidate) => candidate.path === asset.path))
  .sort((left, right) => left.path.localeCompare(right.path))

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`已导入并登记 ${assets.length} 个世界与资源图标。`)
