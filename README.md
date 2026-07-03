# 微光小遊戲

可被 TSY 微光創作室入口網站連接的獨立靜態小遊戲專案。

- 入口網站：https://tsy3991.github.io/TSY.Microglow-Website/
- GitHub Pages repo name：`TSY.Microglow-Games`
- 遊戲大廳：https://tsy3991.github.io/TSY.Microglow-Games/
- 俄羅斯方塊：https://tsy3991.github.io/TSY.Microglow-Games/games/tetris/
- 貪吃蛇：https://tsy3991.github.io/TSY.Microglow-Games/games/snake/
- 小朋友下樓梯：https://tsy3991.github.io/TSY.Microglow-Games/games/downstairs/
- 微光寶石：https://tsy3991.github.io/TSY.Microglow-Games/games/gem/
- 微光連珠對戰：https://tsy3991.github.io/TSY.Microglow-Games/games/orbs/
- metadata：`portal-game.json`

## Structure

```text
Games/
  index.html
  shared/
    base.css
    storage.js
  games/
    tetris/
      index.html
      tetris.css
      tetris.js
    snake/
      index.html
      snake.css
      snake.js
    downstairs/
      index.html
      downstairs.css
      downstairs.js
    gem/
      index.html
      gem.css
      gem.js
    orbs/
      index.html
      orbs.css
      orbs.js
      assets/
        monsters/
```

## Current Games

- `games/tetris/`: 霓虹方塊俄羅斯，支援鍵盤、手機觸控、本機最高分、下一顆預覽、等級、暫停與音效切換。
- `games/snake/`: 微光貪吃蛇，支援鍵盤、手機觸控、本機最高分、玩法彈窗與暫停。
- `games/downstairs/`: 小朋友下樓梯，支援鍵盤、手機觸控、本機最高分、玩法彈窗與暫停。
- `games/gem/`: 微光寶石，支援交換式 match-3、關卡目標、本機最高分、玩法彈窗與暫停。
- `games/orbs/`: 微光連珠對戰，支援拖曳轉珠、連段傷害、怪物 SVG 圖像、受擊/反擊演出、波數與本機紀錄。

## Portal Integration

遊戲結束時會更新入口網站未來可讀取的 localStorage key：

```text
tsyMicroglowPortal.gameStats.v1
```

各遊戲只更新自己的 `games.*` 紀錄，不覆蓋其他遊戲紀錄。

## Deployment

這是純靜態專案，不需要建置流程。GitHub Pages 可直接以 repo root 部署。
