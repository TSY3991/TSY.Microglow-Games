# Microglow Orbs player character asset

The battle stage loads `guardian.webp` first and falls back to the bundled
`guardian.svg` placeholder when the webp is missing, so finished art can be
dropped into this folder without any code changes (same pattern as
`assets/monsters/`).

## Expected deliverable (Codex-generated)

| File            | 角色       | 用途                     |
| ---------------- | ---------- | ------------------------ |
| `guardian.webp`  | 微光守護者 | 玩家方戰鬥站台的主要角色圖 |

## Spec

- Format: WebP with alpha (transparent background), no background plate.
- Size: 512×512, subject centered, feet/base near bottom edge, ~8% padding.
- Weight: aim for <= 100 KB.
- Style: consistent neon "microglow" look, matching the existing monster art
  in `assets/monsters/` (site palette: cyan #2fd7ff, pink #ff5ebc, yellow
  #ffd84d, lime #8df45f, purple #9b6bff on dark #071219 scenes). Ally/hero
  energy-knight feel (not menacing like the monsters) — front-facing or
  three-quarter view, readable at small sizes, glowing cyan/teal core as the
  visual anchor since that's the "ally" color used throughout the UI.
- All artwork must be original (no third-party IP).

The current `guardian.svg` is a simple original placeholder and stays in the
repo as the fallback.
