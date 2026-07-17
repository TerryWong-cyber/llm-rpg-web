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
