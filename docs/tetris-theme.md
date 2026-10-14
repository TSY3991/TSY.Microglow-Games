# Tetris Microglow Theme

2026-10-14

The Tetris page uses the approved warm-white, teal and gold theme. Its dedicated stylesheet replaces the former shared neon theme on this page only. Other games and shared styles are unchanged.

## Integration

- Entry: `games/tetris/index.html`.
- Styles and renderer: `games/tetris/tetris.css` and `tetris.js`; current cache version is `20261014a`.
- Local assets: `games/tetris/assets/`. The existing site logo is referenced from the shared assets directory without alteration. The mascot is a byte-identical copy of the supplied artwork.
- Lucide SVGs include their ISC / MIT notices. Zen Maru Gothic Bold includes its SIL OFL notice. No external font or icon CDN is required at runtime.
- Shared skip-link, portal-return and game-stats scripts remain in use. Keyboard focus and reduced-motion rules remain available from `shared/base.css`.
- No draft storage adapter, fixture score, showcase state or draft label is included.

The grid remains 10 by 20. Controls, collision, scoring, speed progression, queue generation, swap rules, input handlers and storage keys are unchanged. Renderer changes cover block materials, the grid, centered previews, a visual landing outline and the seven-piece palette.

The four score labels and values are centered. On phones, top buttons use 12px labels and 14px icons in a centered column; bottom controls use 13px labels and 18px icons in a centered row. All primary phone targets are at least 44 by 44 CSS pixels. At short portrait sizes the board shadow has at least 8px clearance above the bottom controls.

## Verification

Run `node scripts/qa-tetris.mjs` after installing dependencies and Playwright Chromium. Use `--browser=chrome` to test an installed Chrome, and optionally `--output=<directory>` to retain screenshots and results. Without an output directory, temporary artifacts are removed. The isolated browser and loopback-only test server close when checks finish.

The suite covers 1280x800, 390x844, 390x650 and 320x568, checks asset loading, clipping, score centering, target sizes, overlaps and the board aspect ratio, and exercises:

- Start, keyboard movement, rotation, soft drop, hard drop, pause/resume, restart and single-use swapping.
- Queue updates and real line clearing through levels 6, 11, 16 and 21, unlocking 2 through 5 previews.
- Game-over statistics, preservation of another game's records and root-level data, high-score retention and ISO timestamps.
- Emulated pointer controls, hold-repeat, drag, double-tap rotation, downward swipe and gesture preference storage.
- Unavailable and malformed localStorage, plus keyboard activation of the skip link.

These are automated Chrome checks. They do not replace real-device iOS Safari / Android Chrome acceptance or establish touch latency on physical hardware. A 320px portrait viewport retains the full board but has small cells, so real-device comfort still needs assessment.

For publication, bump CSS/JS and changed asset references together, review the scoped diff, then verify the Pages build and compare public asset bytes with the committed source. Deployment checks are separate from local test results.
