# 远境旅人志前端

Vue 3 + TypeScript + Vite 前端，适配 `llm-rpg-server` 3.0 HTTP 与 WebSocket 契约。

## 本地启动

复制 `.env.example` 为 `.env.local` 并按部署地址修改：

```dotenv
VITE_RPG_API_BASE=http://127.0.0.1:8008
VITE_RPG_WS_BASE=ws://127.0.0.1:8008
```

```bash
npm install
npm run dev
```

生产检查：

```bash
npm run check
```

前端只缓存当前 `player_id` 与最新玩家资料，用于页面刷新。后端使用进程内存保存状态，服务器重启后需要创建新角色。

## 结构

- `src/contracts/`：HTTP、地图、NPC 与战斗协议类型
- `src/api/`：环境配置、请求适配、响应规范化与 WebSocket 客户端
- `src/stores/`：目录、玩家、探索、世界人物和战斗状态
- `src/features/`：按玩法拆分的页面与交互组件
- `src/components/ui/`：跨玩法复用的反馈、物品与状态组件

组件不直接创建 HTTP 或 WebSocket 请求；金币、库存、地图、关系和战斗结果均以服务器响应为准。

## 第三方美术素材

Game-icons 素材放在 `public/assets/vendor/game-icons/<作者>/` 中，由浏览器通过稳定 URL 直接加载，不进入 JavaScript 打包依赖，也不要远程盗链。后端物品目录可以保存类似 `/assets/vendor/game-icons/lorc/broadsword.svg` 的资源路径。

每个素材必须登记到 `public/assets/licenses/assets.manifest.json`，包括标题、作者、原始页面、许可证以及是否修改。游戏页脚的“素材与许可”会展示这份署名清单；`npm run check` 会先执行 `npm run check:assets`，未登记文件或失效记录将阻止检查通过。具体录入步骤和范例见 `public/assets/vendor/game-icons/README.md`。

当前世界地图使用透明背景、米白前景的同风格 Game-icons 变体。若已克隆 Game-icons 官方图标仓库，可运行 `node scripts/import-world-icons.mjs <仓库目录>` 重放本次精选图标的导入、主题转换和许可登记；脚本不会把整套上千个素材复制进项目。
