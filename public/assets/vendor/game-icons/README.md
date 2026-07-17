# Game-icons 素材目录

只把游戏实际使用的图标放进这里，不要提交整套素材库，也不要直接引用 Game-icons 的远程图片地址。

推荐目录结构：

```text
game-icons/
  lorc/
    broadsword.svg
  delapouite/
    potion-ball.svg
```

加入一个图标时：

1. 从图标自己的 Game-icons 页面下载 SVG，确认页面上显示的作者。
2. 使用小写短横线文件名，放到原始页面 URL 中的作者目录（例如 `/1x1/delapouite/` 对应 `delapouite/`）；尽量保留原始 SVG。
3. 在 `/public/assets/licenses/assets.manifest.json` 的 `assets` 中登记一项。
4. 如果改了颜色、轮廓、裁切或组合方式，将 `modified` 设为 `true` 并写明 `modifications`。
5. 执行 `npm run check:assets`；漏登记、重复登记或文件不存在都会失败。

地图与世界资源使用一组经过筛选的统一主题图标。若本地已有 Game-icons 官方 `icons` 仓库，可用下面的命令重放导入流程：

```bash
node scripts/import-world-icons.mjs /path/to/game-icons-icons
```

该脚本只导入项目实际使用的精选文件，移除官方 SVG 的默认黑色背景、将前景改为地图使用的米白色，并同步写入每个图标的作者、原始页面和修改说明。新增脚本清单外的素材仍需按下述流程人工核对来源。

登记范例（仅作格式说明，不要原样加入清单）：

```json
{
  "path": "/assets/vendor/game-icons/lorc/broadsword.svg",
  "title": "Broadsword",
  "author": "Lorc",
  "source_url": "https://game-icons.net/1x1/lorc/broadsword.html",
  "license": "CC-BY-3.0",
  "modified": true,
  "modifications": "将图标颜色调整为项目主题色，未改变图形轮廓。"
}
```
