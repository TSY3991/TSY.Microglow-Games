# Microglow Orbs monster assets

The game loads `<key>.webp` first and falls back to the bundled `<key>.svg`
placeholder when the webp is missing, so finished art can be dropped into this
folder without any code changes.

## Expected deliverables (Codex-generated)

| File            | 敵人名稱   | 波數輪替順序 |
| --------------- | ---------- | ------------ |
| `slime.webp`    | 濁光史萊姆 | 1, 8, 15…    |
| `sentinel.webp` | 微光哨兵   | 2, 9, 16…    |
| `guardian.webp` | 霓虹守衛   | 3, 10, 17…   |
| `golem.webp`    | 脈衝魔像   | 4, 11, 18…   |
| `phantom.webp`  | 幻影守門者 | 5, 12, 19…   |
| `abyss.webp`    | 深淵行者   | 6, 13, 20…   |
| `beast.webp`    | 共鳴巨獸   | 7, 14, 21…   |

## Spec

- Format: WebP with alpha (transparent background), no background plate.
- Size: 512×512, subject centered, feet/base near bottom edge, ~8% padding.
- Weight: aim for <= 100 KB per file.
- Style: consistent neon "microglow" look across all seven (site palette:
  cyan #2fd7ff, pink #ff5ebc, yellow #ffd84d, lime #8df45f, purple #9b6bff on
  dark #071219 scenes). Front-facing, readable at small sizes, cute-menacing.
- All artwork must be original (no third-party IP).

The current `.svg` files are simple original placeholders and stay in the repo
as the fallback.
