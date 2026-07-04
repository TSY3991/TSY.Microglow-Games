(function () {
  const boardCanvas = document.querySelector("#orbsBoard");
  const context = boardCanvas.getContext("2d");
  const overlay = document.querySelector("[data-overlay]");
  const overlayTitle = document.querySelector("[data-overlay-title]");
  const overlayMessage = document.querySelector("[data-overlay-message]");
  const scoreEl = document.querySelector("[data-score]");
  const bestEl = document.querySelector("[data-best]");
  const waveEl = document.querySelector("[data-wave]");
  const playsEl = document.querySelector("[data-plays]");
  const timeEl = document.querySelector("[data-time]");
  const playerHpEl = document.querySelector("[data-player-hp]");
  const playerHpTrack = document.querySelector("[data-player-hp-track]");
  const playerHpCardEl = document.querySelector("[data-player-hp-card]");
  const enemyHpEl = document.querySelector("[data-enemy-hp]");
  const enemyHpTrack = document.querySelector("[data-enemy-hp-track]");
  const enemyHpCardEl = document.querySelector("[data-enemy-hp-card]");
  const enemyNameEl = document.querySelector("[data-enemy-name]");
  const enemyStageEl = document.querySelector("[data-enemy-stage]");
  const battleStageEl = document.querySelector(".battle-stage");
  const enemyImageEl = document.querySelector("[data-enemy-image]");
  const enemyBadgeEl = document.querySelector("[data-enemy-badge]");
  const enemyAtkEl = document.querySelector("[data-enemy-atk]");
  const combatFloatsEl = document.querySelector("[data-combat-floats]");
  const playerStageEl = document.querySelector("[data-player-stage]");
  const playerImageEl = document.querySelector("[data-player-image]");
  const playerFloatsEl = document.querySelector("[data-combat-floats-player]");
  const playerLevelEl = document.querySelector("[data-player-level]");
  const battleTimerEl = document.querySelector("[data-battle-timer]");
  const battleTimeEl = document.querySelector("[data-battle-time]");
  const storyToastEl = document.querySelector("[data-story-toast]");
  const instructionModal = document.querySelector("[data-instruction-modal]");
  const portalStats = window.MicroglowGameStats;

  const gameId = "microglow-orbs";
  const gameTitle = "微光連珠對戰";

  const COLS = 6;
  const ROWS = 5;
  const CELL = 62;
  const boardPxWidth = COLS * CELL;
  const boardPxHeight = ROWS * CELL;

  const HEAL_COLOR_ID = 5;
  const COLORS = [
    { id: 0, name: "fire", fill: "#f23a2e", glow: "rgba(255, 68, 55, 0.58)", mark: "#ffb4a9" },
    { id: 1, name: "water", fill: "#2aa8ff", glow: "rgba(47, 215, 255, 0.55)", mark: "#dff7ff" },
    { id: 2, name: "wood", fill: "#2fda55", glow: "rgba(141, 244, 95, 0.55)", mark: "#dbffd6" },
    { id: 3, name: "light", fill: "#f4bd39", glow: "rgba(255, 216, 77, 0.55)", mark: "#fff2bc" },
    { id: 4, name: "dark", fill: "#a324d7", glow: "rgba(155, 107, 255, 0.55)", mark: "#f1d8ff" },
    { id: HEAL_COLOR_ID, name: "heal", fill: "#ff6fa8", glow: "rgba(255, 111, 168, 0.55)", mark: "#ffe3ef" }
  ];
  // Heal orbs are rarer than the 5 combat colors so healing stays a bonus,
  // not the dominant strategy — weight below in randomColor().
  const COLOR_WEIGHTS = COLORS.map((color) => (color.id === HEAL_COLOR_ID ? 0.6 : 1));
  const TOTAL_COLOR_WEIGHT = COLOR_WEIGHTS.reduce((sum, weight) => sum + weight, 0);
  const HEAL_PER_ORB = 20;

  // `art` is the base filename in assets/monsters/ (no extension): the loader
  // tries the Codex-generated .webp first and falls back to the bundled .svg
  // placeholder, so new art drops in without code changes.
  const ORB_ART_FILES = ["fire.webp", "water.webp", "wood.webp", "light.webp", "dark.webp", "heal.png"];
  const orbArtImages = ORB_ART_FILES.map((file) => {
    if (!file) return null;
    const image = new Image();
    image.decoding = "async";
    image.src = `./assets/orbs/${file}`;
    image.addEventListener("load", () => {
      orbSpriteCache.clear();
      draw();
      wake();
    });
    return image;
  });
  const ENEMIES = [
    { name: "濁光史萊姆", art: "slime" },
    { name: "微光哨兵", art: "sentinel" },
    { name: "霓虹守衛", art: "guardian" },
    { name: "脈衝魔像", art: "golem" },
    { name: "幻影守門者", art: "phantom" },
    { name: "深淵行者", art: "abyss" },
    { name: "共鳴巨獸", art: "beast" }
  ];

  const BASE_ORB_DAMAGE = 16;
  const COMBO_BONUS = 0.18;
  const PLAYER_BASE_MAX_HP = 800;
  const START_TIME = 75;
  const XP_SCORE_DIVISOR = 12;
  const XP_PER_WAVE = 18;
  const TIER_STORY_LINES = [
    "",
    "深層封鎖解除，敵人的微光頻率開始失控。",
    "深淵訊號增幅中，一股更強大的力量正在甦醒。",
    "王者級脈衝降臨，守護者核心全力運轉。"
  ];
  // Every full loop through the 7 monster arts bumps the tier, so wave 8+
  // reuses the same art (recolored via CSS) but hits meaningfully harder
  // instead of just repeating the wave-1 numbers with a small linear bump.
  const TIER_SIZE = ENEMIES.length;
  const TIER_LABELS = ["", "・強化", "・精英", "・王者"];
  const TIER_HP_MULT = [1, 1.35, 1.8, 2.35];
  const TIER_ATK_MULT = [1, 1.3, 1.65, 2.05];
  const COMBAT_PROJECTILE_MS = 300;
  const REDUCED_MOTION_PROJECTILE_MS = 70;
  const reducedMotionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");

  let board = [];
  let score = 0;
  let best = 0;
  let plays = 0;
  let bestWave = 0;
  let playerLevel = 1;
  let playerXp = 0;
  let playerMaxHp = PLAYER_BASE_MAX_HP;
  let wave = 1;
  let playerHp = PLAYER_BASE_MAX_HP;
  let enemy = null;
  let timeLeft = START_TIME;
  let running = false;
  let paused = false;
  let recordedThisRun = false;
  let dragging = null; // { path: [{r,c}], pointerId, heldId, pointerX, pointerY }
  let cursor = { r: 2, c: 2 };
  let cursorVisible = false;
  let keyboardHolding = false;
  let particles = [];
  let popups = [];
  let pushRipples = [];
  let animationFrameId = 0;
  let lastTime = 0;
  let timerHandle = 0;
  let backgroundCanvas = null;
  let stageEffectTimer = 0;
  let stageFollowupTimer = 0;
  let playerEffectTimer = 0;
  let storyToastTimer = 0;
  const delayedCombatTimers = new Set();
  const cellAnimations = new Map();
  const SWAP_ANIMATION_MS = 230;
  const orbSpriteCache = new Map();

  const uiCache = {};

  ensurePortalStats();
  best = readBestScore();
  plays = readPlays();
  bestWave = readBestWave();
  playerLevel = readPlayerLevel();
  playerXp = readPlayerXp();
  playerMaxHp = getPlayerMaxHp();
  playerHp = playerMaxHp;

  initBoard();
  updateUi();
  fitBoardCanvas();
  draw();
  showOverlay("準備開戰", "拖曳任意路徑連接 3 顆以上同色元素珠攻擊敵人；每一波 75 秒，擊破後倒數重置。", "開始遊戲");

  window.addEventListener("resize", fitBoardCanvas);
  window.addEventListener("orientationchange", fitBoardCanvas);
  lockPageGestures();

  /* ---------- layout ---------- */

  function lockPageGestures() {
    let lastTouchEnd = 0;
    const preventBoardTouch = (event) => {
      event.preventDefault();
    };
    ["touchstart", "touchmove", "touchend", "touchcancel"].forEach((type) => {
      boardCanvas.addEventListener(type, preventBoardTouch, { passive: false });
    });
    document.addEventListener("touchmove", (event) => {
      if (canScrollOverlay(event.target)) return;
      event.preventDefault();
    }, { passive: false });
    document.addEventListener("touchend", (event) => {
      const now = Date.now();
      if (now - lastTouchEnd < 420) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });
    document.addEventListener("dblclick", (event) => {
      event.preventDefault();
    }, { passive: false });
    ["gesturestart", "gesturechange", "gestureend"].forEach((type) => {
      document.addEventListener(type, (event) => {
        event.preventDefault();
      }, { passive: false });
    });
  }

  function canScrollOverlay(target) {
    if (!(target instanceof Element)) return false;
    const scrollHost = target.closest(".instruction-card, .game-overlay");
    return Boolean(scrollHost && scrollHost.scrollHeight > scrollHost.clientHeight);
  }

  // The page is locked (no scrolling), so the board scales itself to whatever
  // space .board-frame has left instead of relying on document flow.
  function fitBoardCanvas() {
    const frame = boardCanvas.parentElement;
    if (!frame) return;
    const availableWidth = Math.min(frame.clientWidth, 460);
    const availableHeight = frame.clientHeight;
    if (availableWidth <= 0 || availableHeight <= 0) return;
    const scale = Math.min(availableWidth / boardPxWidth, availableHeight / boardPxHeight);
    boardCanvas.style.width = `${Math.floor(boardPxWidth * scale)}px`;
    boardCanvas.style.height = `${Math.floor(boardPxHeight * scale)}px`;
  }

  /* ---------- portal stats ---------- */

  function readBestScore() {
    return Number(portalStats.readGame(gameId).bestScore) || 0;
  }

  function readPlays() {
    return Number(portalStats.readGame(gameId).plays) || 0;
  }

  function readBestWave() {
    return Number(portalStats.readGame(gameId).bestWave) || 0;
  }

  function readPlayerLevel() {
    return Math.max(1, Number(portalStats.readGame(gameId).playerLevel) || 1);
  }

  function readPlayerXp() {
    return Math.max(0, Number(portalStats.readGame(gameId).playerXp) || 0);
  }

  function ensurePortalStats() {
    portalStats.ensureGame(gameId, gameTitle, { bestWave: 0, playerLevel: 1, playerXp: 0 });
  }

  function writePortalStats(lastScore, bestScore, bestWaveThisRun, nextPlayerLevel = playerLevel, nextPlayerXp = playerXp) {
    portalStats.recordRun(gameId, gameTitle, lastScore, bestScore, { bestWave: bestWaveThisRun });
    return portalStats.updateGame(gameId, (existing) => ({
      ...existing,
      title: gameTitle,
      playerLevel: nextPlayerLevel,
      playerXp: nextPlayerXp,
      updatedAt: new Date().toISOString()
    }));
  }

  function xpNeededForLevel(level) {
    return Math.round(100 * Math.pow(Math.max(1, level), 1.4));
  }

  function getPlayerMaxHp(level = playerLevel) {
    return PLAYER_BASE_MAX_HP + (Math.max(1, level) - 1) * 20;
  }

  function getPlayerDamagePerOrb(level = playerLevel) {
    return BASE_ORB_DAMAGE + Math.floor((Math.max(1, level) - 1) / 2);
  }

  function getPlayerHealPerOrb(level = playerLevel) {
    return HEAL_PER_ORB + Math.floor((Math.max(1, level) - 1) * 1.5);
  }

  function calculateRunXp(lastScore, reachedWave) {
    if (lastScore <= 0 && reachedWave <= 1) return 0;
    return Math.max(20, Math.floor(lastScore / XP_SCORE_DIVISOR) + Math.max(0, reachedWave - 1) * XP_PER_WAVE);
  }

  function applyPlayerXp(gainedXp) {
    const oldLevel = playerLevel;
    let nextLevel = playerLevel;
    let nextXp = playerXp + Math.max(0, gainedXp);
    while (nextXp >= xpNeededForLevel(nextLevel)) {
      nextXp -= xpNeededForLevel(nextLevel);
      nextLevel += 1;
    }
    playerLevel = nextLevel;
    playerXp = nextXp;
    playerMaxHp = getPlayerMaxHp();
    return { gainedXp, oldLevel, newLevel: nextLevel, leveled: nextLevel > oldLevel };
  }

  function recordFinishedRun(showProgress = false) {
    const xpGained = calculateRunXp(score, wave);
    const progress = applyPlayerXp(xpGained);
    const result = writePortalStats(score, Math.max(best, score), Math.max(bestWave, wave), playerLevel, playerXp);
    plays = result.plays;
    best = result.bestScore;
    bestWave = result.bestWave;
    if (showProgress && progress.leveled) {
      playPlayerEffect("is-level", 900);
      floatPlayerText("升級！", "is-level");
      showStoryToast(`微光核心升階至 Lv.${playerLevel}，你感覺到自己變強了。`, 3000);
    }
    return { result, progress };
  }

  /* ---------- board setup ---------- */

  function randomColor() {
    let roll = Math.random() * TOTAL_COLOR_WEIGHT;
    for (let i = 0; i < COLORS.length; i += 1) {
      roll -= COLOR_WEIGHTS[i];
      if (roll <= 0) return i;
    }
    return COLORS.length - 1;
  }

  function initBoard() {
    board = [];
    for (let r = 0; r < ROWS; r += 1) {
      const row = [];
      for (let c = 0; c < COLS; c += 1) {
        let color;
        do {
          color = randomColor();
        } while (
          (c >= 2 && row[c - 1].color === color && row[c - 2].color === color) ||
          (r >= 2 && board[r - 1][c].color === color && board[r - 2][c].color === color)
        );
        row.push({ color, id: crypto.randomUUID?.() || `${Date.now()}-${r}-${c}-${Math.random()}` });
      }
      board.push(row);
    }
  }

  function makeEnemy(waveNumber) {
    const template = ENEMIES[(waveNumber - 1) % TIER_SIZE];
    const tier = Math.min(TIER_LABELS.length - 1, Math.floor((waveNumber - 1) / TIER_SIZE));
    const baseHp = 120 + (waveNumber - 1) * 55;
    const baseAtk = 24 + (waveNumber - 1) * 4;
    const hp = Math.round(baseHp * TIER_HP_MULT[tier]);
    const atk = Math.round(baseAtk * TIER_ATK_MULT[tier]);
    const name = `${template.name}${TIER_LABELS[tier]}`;
    return { ...template, name, hp, maxHp: hp, atk, tier };
  }

  // Time bonus after a kill shrinks as tier rises so high waves can't coast
  // on an always-full clock; floors out instead of vanishing entirely.
  function timeBonusForTier(tier) {
    return Math.max(45, START_TIME - tier * 8);
  }

  // Remembers which extension actually exists per art key ("webp" preferred,
  // "svg" fallback) so a missing webp only 404s once, not every wave.
  const artExtCache = new Map();

  function enemyArtSrc(artKey) {
    return `./assets/monsters/${artKey}.${artExtCache.get(artKey) || "webp"}`;
  }

  enemyImageEl?.addEventListener("error", () => {
    const src = enemyImageEl.getAttribute("src") || "";
    const match = src.match(/([a-z0-9_-]+)\.webp$/i);
    if (!match) return;
    artExtCache.set(match[1], "svg");
    enemyImageEl.setAttribute("src", enemyArtSrc(match[1]));
  });

  // Same webp-first/svg-fallback pattern as the monster art, so a future
  // Codex-generated guardian.webp drops in without any code changes.
  function playerArtSrc(artKey) {
    return `./assets/player/${artKey}.${artExtCache.get(`player-${artKey}`) || "webp"}`;
  }

  playerImageEl?.addEventListener("error", () => {
    const src = playerImageEl.getAttribute("src") || "";
    const match = src.match(/([a-z0-9_-]+)\.webp$/i);
    if (!match) return;
    artExtCache.set(`player-${match[1]}`, "svg");
    playerImageEl.setAttribute("src", playerArtSrc(match[1]));
  });

  if (playerImageEl) playerImageEl.setAttribute("src", playerArtSrc("guardian"));


  /* ---------- match detection & resolution ---------- */

  function inBounds(r, c) {
    return r >= 0 && r < ROWS && c >= 0 && c < COLS;
  }

  function findMatches() {
    const matched = new Set();
    for (let r = 0; r < ROWS; r += 1) {
      let runStart = 0;
      for (let c = 1; c <= COLS; c += 1) {
        const sameAsPrev = c < COLS && board[r][c].color === board[r][runStart].color;
        if (!sameAsPrev) {
          if (c - runStart >= 3) for (let k = runStart; k < c; k += 1) matched.add(`${r},${k}`);
          runStart = c;
        }
      }
    }
    for (let c = 0; c < COLS; c += 1) {
      let runStart = 0;
      for (let r = 1; r <= ROWS; r += 1) {
        const sameAsPrev = r < ROWS && board[r][c].color === board[runStart][c].color;
        if (!sameAsPrev) {
          if (r - runStart >= 3) for (let k = runStart; k < r; k += 1) matched.add(`${k},${c}`);
          runStart = r;
        }
      }
    }
    return matched;
  }

  function eliminateCells(matched) {
    for (const key of matched) {
      const [r, c] = key.split(",").map(Number);
      const gem = board[r][c];
      const x = c * CELL + CELL / 2;
      const y = r * CELL + CELL / 2;
      spawnBurst(x, y, COLORS[gem.color].fill, 7);
      board[r][c] = null;
    }
  }

  function applyGravityAndRefill() {
    for (let c = 0; c < COLS; c += 1) {
      let writeR = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r -= 1) {
        if (board[r][c]) {
          if (r !== writeR) {
            board[writeR][c] = board[r][c];
            board[r][c] = null;
          }
          writeR -= 1;
        }
      }
      for (let r = writeR; r >= 0; r -= 1) {
        board[r][c] = { color: randomColor(), id: crypto.randomUUID?.() || `${Date.now()}-${r}-${c}-${Math.random()}` };
      }
    }
  }

  // Counts distinct same-color connected clusters within a matched set (must
  // run before eliminateCells mutates the board) — this is what "combo"
  // means per the in-game instructions: simultaneous separate match groups
  // AND cascade chains from gravity refills both add to the combo count.
  // Splits a matched set into distinct same-color connected clusters (BFS),
  // returning each group's color and cell count. Heal-colored groups don't
  // deal damage or count toward the combo multiplier — they heal the player
  // directly, so matching them is a clear, separate action from attacking.
  function groupMatches(matched) {
    const visited = new Set();
    const groups = [];
    for (const key of matched) {
      if (visited.has(key)) continue;
      const [startR, startC] = key.split(",").map(Number);
      const color = board[startR][startC].color;
      let size = 0;
      const queue = [key];
      while (queue.length) {
        const current = queue.pop();
        if (visited.has(current)) continue;
        visited.add(current);
        size += 1;
        const [r, c] = current.split(",").map(Number);
        const neighbours = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
        for (const [nr, nc] of neighbours) {
          const neighbourKey = `${nr},${nc}`;
          if (matched.has(neighbourKey) && !visited.has(neighbourKey) && board[nr]?.[nc]?.color === color) {
            queue.push(neighbourKey);
          }
        }
      }
      groups.push({ color, size });
    }
    return groups;
  }

  // Runs the full chain synchronously (no per-step animation delay) so a
  // finished turn always resolves before the enemy counterattacks — this also
  // keeps the core combat logic independent of requestAnimationFrame timing.
  function resolveBoard() {
    let totalDamage = 0;
    let totalHeal = 0;
    let comboCount = 0;
    for (;;) {
      const matches = findMatches();
      if (!matches.size) break;
      for (const group of groupMatches(matches)) {
        if (group.color === HEAL_COLOR_ID) {
          totalHeal += group.size * getPlayerHealPerOrb();
        } else {
          comboCount += 1;
          totalDamage += group.size * getPlayerDamagePerOrb();
        }
      }
      eliminateCells(matches);
      applyGravityAndRefill();
    }
    if (comboCount > 1) totalDamage = Math.round(totalDamage * (1 + COMBO_BONUS * (comboCount - 1)));
    return { totalDamage, comboCount, totalHeal };
  }

  /* ---------- turn & combat flow ---------- */

  function finalizeTurn(pathLength) {
    dragging = null;
    cursorVisible = false;
    keyboardHolding = false;
    cellAnimations.clear();
    if (!running || paused || pathLength <= 0) {
      draw();
      return;
    }

    const result = resolveBoard();
    let enemyDefeated = false;
    if (result.totalDamage > 0) {
      enemyDefeated = dealDamageToEnemy(result.totalDamage, result.comboCount);
    }
    if (result.totalHeal > 0) {
      applyHeal(result.totalHeal);
    }
    // Skip the counterattack on the turn that lands the killing blow — the
    // freshly-spawned next-wave enemy shouldn't get a free hit before the
    // player has even seen it.
    let enemyImpactDelay = 0;
    if (running && enemy && !enemyDefeated) {
      enemyImpactDelay = enemyAttack();
    }
    if (playerHp <= 0 && enemyImpactDelay > 0) {
      paused = true;
      scheduleCombatTimeout(() => checkEnd(), enemyImpactDelay + 70);
    } else {
      checkEnd();
    }
    updateUi();
    draw();
    wake();
  }

  function dealDamageToEnemy(damage, comboCount) {
    score += damage;
    enemy.hp = Math.max(0, enemy.hp - damage);
    const impactDelay = launchCombatProjectile(playerStageEl, enemyStageEl, "player");
    playPlayerEffect("is-attack");
    if (enemy.hp > 0) {
      scheduleStageEffect("is-hit", impactDelay, 360);
    }
    floatCombatText(`${comboCount > 1 ? `COMBO x${comboCount} ` : ""}-${damage}`, "damage");
    announce(`${comboCount > 1 ? `連段 x${comboCount} ` : ""}-${damage}`, boardPxWidth / 2, boardPxHeight * 0.32, "#ffd84d");
    if (enemy.hp <= 0) {
      floatCombatText("擊破", "break");
      scheduleStageEffect("is-break", impactDelay, 560);
      wave += 1;
      const clearedTier = enemy.tier;
      enemy = makeEnemy(wave);
      timeLeft = timeBonusForTier(clearedTier);
      updateTimerUi();
      scheduleStageEffect("is-spawn", impactDelay + 280, 620);
      if (enemy.tier > clearedTier) showStoryToast(TIER_STORY_LINES[enemy.tier] || "深層訊號正在增幅，新的威脅已經接近。", 2600);
      const timeNote = clearedTier > 0 ? `倒數重置為 ${timeLeft} 秒` : "倒數重置";
      announce(`擊破！${timeNote}，下一波來襲`, boardPxWidth / 2, boardPxHeight * 0.5, "#8df45f");
      return true;
    }
    return false;
  }

  // Heal orbs are the only source of HP recovery — matching them is a
  // deliberate player action with an immediate, visible +HP result, unlike an
  // automatic on-clear heal that wouldn't obviously tie back to anything the
  // player did.
  function applyHeal(amount) {
    if (playerHp >= playerMaxHp) return;
    const before = playerHp;
    playerHp = Math.min(playerMaxHp, playerHp + amount);
    const healed = playerHp - before;
    if (healed <= 0) return;
    playPlayerEffect("is-heal", 620);
    floatPlayerText(`+${healed}`, "is-heal");
    announce(`+${healed}`, boardPxWidth / 2, boardPxHeight * 0.32, "#8df45f");
  }

  function enemyAttack() {
    playerHp = Math.max(0, playerHp - enemy.atk);
    playStageEffect("is-attack");
    const impactDelay = launchCombatProjectile(enemyStageEl, playerStageEl, "enemy");
    scheduleCombatTimeout(() => {
      if (!running) return;
      playPlayerEffect("is-hit");
      floatPlayerText(`-${enemy.atk}`, "is-hit");
      announce(`-${enemy.atk}`, boardPxWidth / 2, boardPxHeight * 0.7, "#ff5ebc");
    }, impactDelay);
    floatCombatText(`-${enemy.atk}`, "attack");
    return impactDelay;
  }

  function checkEnd() {
    if (playerHp <= 0) {
      triggerGameOver("被擊倒了", "敵人的攻勢超出負荷");
    }
  }

  /* ---------- timer ---------- */

  function startTimer() {
    stopTimer();
    timerHandle = window.setInterval(() => {
      if (!running || paused) return; // extra guard; pausing normally clears this interval entirely
      timeLeft -= 1;
      if (timeLeft <= 0) {
        timeLeft = 0;
        updateTimerUi();
        triggerGameOver("時間到", "在時限內盡量累積傷害");
        return;
      }
      updateTimerUi();
    }, 1000);
  }

  function stopTimer() {
    if (timerHandle) {
      window.clearInterval(timerHandle);
      timerHandle = 0;
    }
  }

  /* ---------- game lifecycle ---------- */

  function startGame() {
    if (running) return;
    running = true;
    paused = false;
    recordedThisRun = false;
    score = 0;
    wave = 1;
    playerMaxHp = getPlayerMaxHp();
    playerHp = playerMaxHp;
    enemy = makeEnemy(1);
    timeLeft = START_TIME;
    dragging = null;
    particles = [];
    popups = [];
    cellAnimations.clear();
    clearCombatProjectiles();
    clearStageEffect();
    combatFloatsEl.replaceChildren();
    initBoard();
    hideOverlay();
    updateUi();
    draw();
    playStageEffect("is-spawn", 620);
    startTimer();
    wake();
  }

  function restartGame() {
    if (running && !recordedThisRun) {
      recordedThisRun = true;
      recordFinishedRun(false);
    }
    running = false;
    paused = false;
    stopTimer();
    stopLoop();
    startGame();
  }

  function triggerGameOver(title, message) {
    if (recordedThisRun) return;
    recordedThisRun = true;
    running = false;
    paused = false;
    stopTimer();
    stopLoop();
    clearCombatProjectiles();
    clearStageEffect();
    const { progress } = recordFinishedRun(true);
    updateUi();
    draw();
    const xpNote = progress.gainedXp > 0 ? `，獲得 ${progress.gainedXp} XP` : "";
    const levelNote = progress.leveled ? `，升至 Lv.${progress.newLevel}` : `，守護者 Lv.${playerLevel}`;
    showOverlay(title, `${message}，本局分數 ${score}，抵達第 ${wave} 波，最高分 ${best}${xpNote}${levelNote}`, "再玩一次");
  }

  function togglePause() {
    if (!running) {
      startGame();
      return;
    }
    if (!paused && dragging) {
      // Auto-pause (tab hidden) or the pause button firing mid-drag must
      // settle the swaps already made as a real turn instead of discarding
      // them — otherwise the board can be left in a matched-but-unresolved
      // state, or repeatedly interrupted to dodge the counterattack.
      finalizeTurn(dragging.path.length - 1);
      if (!running) return; // resolving the turn ended the game (HP hit 0)
    }
    paused = !paused;
    if (paused) {
      cursorVisible = false;
      stopLoop();
      stopTimer();
      showOverlay("已暫停", "按繼續或開始按鈕回到戰鬥", "繼續遊戲");
    } else {
      hideOverlay();
      lastTime = performance.now();
      startTimer();
      wake();
    }
  }

  /* ---------- rendering ---------- */

  function getBackgroundCanvas() {
    if (backgroundCanvas) return backgroundCanvas;
    backgroundCanvas = document.createElement("canvas");
    backgroundCanvas.width = boardPxWidth;
    backgroundCanvas.height = boardPxHeight;
    const bg = backgroundCanvas.getContext("2d");
    const base = bg.createLinearGradient(0, 0, 0, boardPxHeight);
    base.addColorStop(0, "#241a34");
    base.addColorStop(0.5, "#141123");
    base.addColorStop(1, "#0a1320");
    bg.fillStyle = base;
    bg.fillRect(0, 0, boardPxWidth, boardPxHeight);

    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const x = c * CELL + 5;
        const y = r * CELL + 5;
        drawRoundRect(bg, x, y, CELL - 10, CELL - 10, 11);
        bg.fillStyle = "rgba(0, 0, 0, 0.25)";
        bg.fill();
        bg.strokeStyle = "rgba(255, 225, 150, 0.12)";
        bg.lineWidth = 1.2;
        bg.stroke();
      }
    }

    bg.strokeStyle = "rgba(255, 216, 120, 0.18)";
    bg.lineWidth = 2;
    bg.strokeRect(1, 1, boardPxWidth - 2, boardPxHeight - 2);
    return backgroundCanvas;
  }

  function drawRoundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function hexToRgb(hex) {
    const clean = hex.replace("#", "");
    const value = Number.parseInt(clean, 16);
    return {
      r: (value >> 16) & 255,
      g: (value >> 8) & 255,
      b: value & 255
    };
  }

  function rgbaFromHex(hex, alpha) {
    const rgb = hexToRgb(hex);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }
  function stonePoints(colorIndex) {
    const shapes = [
      [[-0.88, -0.4], [-0.58, -0.84], [-0.06, -0.94], [0.5, -0.82], [0.86, -0.42], [0.9, 0.2], [0.56, 0.72], [0.04, 0.92], [-0.58, 0.76], [-0.9, 0.18]],
      [[-0.78, -0.72], [-0.18, -0.86], [0.58, -0.76], [0.86, -0.28], [0.76, 0.58], [0.3, 0.86], [-0.54, 0.76], [-0.88, 0.28]],
      [[0, -0.96], [0.28, -0.6], [0.78, -0.56], [0.56, -0.1], [0.9, 0.28], [0.34, 0.36], [0.12, 0.88], [-0.24, 0.44], [-0.76, 0.56], [-0.54, 0.06], [-0.88, -0.34], [-0.36, -0.46]],
      [[-0.58, -0.84], [0.52, -0.84], [0.84, -0.48], [0.78, 0.52], [0.34, 0.9], [-0.48, 0.82], [-0.84, 0.36], [-0.78, -0.46]],
      [[-0.7, -0.78], [-0.08, -0.9], [0.66, -0.74], [0.9, -0.16], [0.64, 0.6], [0.12, 0.92], [-0.54, 0.76], [-0.88, 0.22]],
      [[0, -0.9], [0.42, -0.66], [0.84, -0.3], [0.7, 0.3], [0.3, 0.82], [-0.3, 0.82], [-0.7, 0.3], [-0.84, -0.3], [-0.42, -0.66]]
    ];
    return shapes[colorIndex] || shapes[0];
  }

  function traceStonePath(ctx, points, cx, cy, radius, scale = 1) {
    const scaled = points.map(([x, y]) => ({ x: cx + x * radius * scale, y: cy + y * radius * scale }));
    ctx.beginPath();
    for (let i = 0; i < scaled.length; i += 1) {
      const current = scaled[i];
      const next = scaled[(i + 1) % scaled.length];
      const mid = { x: (current.x + next.x) / 2, y: (current.y + next.y) / 2 };
      if (i === 0) ctx.moveTo(mid.x, mid.y);
      ctx.quadraticCurveTo(next.x, next.y, (next.x + scaled[(i + 2) % scaled.length].x) / 2, (next.y + scaled[(i + 2) % scaled.length].y) / 2);
    }
    ctx.closePath();
  }

  function drawFacet(ctx, cx, cy, radius, points, fill) {
    ctx.beginPath();
    points.forEach(([x, y], index) => {
      const px = cx + x * radius;
      const py = cy + y * radius;
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function getOrbSprite(colorIndex) {
    let sprite = orbSpriteCache.get(colorIndex);
    if (sprite) return sprite;
    const color = COLORS[colorIndex];
    const artImage = orbArtImages[colorIndex];
    if (artImage?.complete && artImage.naturalWidth > 0) {
      sprite = document.createElement("canvas");
      const size = CELL + 14;
      sprite.width = size;
      sprite.height = size;
      const sc = sprite.getContext("2d");
      sc.imageSmoothingEnabled = true;
      sc.imageSmoothingQuality = "high";
      sc.drawImage(artImage, 0, 0, size, size);
      orbSpriteCache.set(colorIndex, sprite);
      return sprite;
    }
    const radius = CELL * 0.41;
    const pad = 17;
    const points = stonePoints(colorIndex);
    sprite = document.createElement("canvas");
    sprite.width = Math.ceil(radius * 2 + pad * 2);
    sprite.height = Math.ceil(radius * 2 + pad * 2);
    const sc = sprite.getContext("2d");
    const cx = sprite.width / 2;
    const cy = sprite.height / 2;

    sc.save();
    sc.scale(1, 0.36);
    const shadow = sc.createRadialGradient(cx, (cy + radius * 1.18) / 0.36, radius * 0.18, cx, (cy + radius * 1.18) / 0.36, radius * 1.08);
    shadow.addColorStop(0, "rgba(0, 0, 0, 0.52)");
    shadow.addColorStop(1, "rgba(0, 0, 0, 0)");
    sc.fillStyle = shadow;
    sc.beginPath();
    sc.arc(cx, (cy + radius * 1.18) / 0.36, radius * 1.08, 0, Math.PI * 2);
    sc.fill();
    sc.restore();

    sc.save();
    sc.shadowColor = color.glow;
    sc.shadowBlur = 10;
    traceStonePath(sc, points, cx, cy, radius, 1.03);
    sc.fillStyle = "rgba(7, 7, 13, 0.92)";
    sc.fill();
    sc.restore();

    sc.save();
    traceStonePath(sc, points, cx, cy, radius, 0.93);
    sc.clip();
    const fill = sc.createRadialGradient(cx - radius * 0.35, cy - radius * 0.45, radius * 0.08, cx + radius * 0.12, cy + radius * 0.12, radius * 1.1);
    fill.addColorStop(0, rgbaFromHex(color.mark, 0.94));
    fill.addColorStop(0.24, rgbaFromHex(color.fill, 0.98));
    fill.addColorStop(0.62, rgbaFromHex(color.fill, 0.78));
    fill.addColorStop(1, "rgba(6, 7, 12, 0.86)");
    sc.fillStyle = fill;
    sc.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

    drawFacet(sc, cx, cy, radius, [[-0.82, -0.24], [-0.34, -0.86], [0.06, -0.22], [-0.2, 0.08]], "rgba(255,255,255,0.24)");
    drawFacet(sc, cx, cy, radius, [[0.08, -0.24], [0.58, -0.72], [0.82, -0.14], [0.32, 0.08]], "rgba(255,255,255,0.15)");
    drawFacet(sc, cx, cy, radius, [[-0.78, -0.1], [-0.2, 0.12], [-0.58, 0.72], [-0.9, 0.22]], "rgba(0,0,0,0.2)");
    drawFacet(sc, cx, cy, radius, [[-0.14, 0.12], [0.34, 0.04], [0.72, 0.58], [0.08, 0.82], [-0.28, 0.56]], "rgba(0,0,0,0.28)");
    drawFacet(sc, cx, cy, radius, [[-0.16, -0.1], [0.14, -0.28], [0.42, -0.02], [0.1, 0.26]], "rgba(255,255,255,0.16)");

    sc.strokeStyle = "rgba(255,255,255,0.18)";
    sc.lineWidth = 1.2;
    for (const angle of [-0.95, -0.35, 0.22, 0.78]) {
      sc.beginPath();
      sc.moveTo(cx + Math.cos(angle) * radius * 0.16, cy + Math.sin(angle) * radius * 0.16);
      sc.lineTo(cx + Math.cos(angle) * radius * 0.78, cy + Math.sin(angle) * radius * 0.78);
      sc.stroke();
    }

    const gloss = sc.createRadialGradient(cx - radius * 0.42, cy - radius * 0.46, 0, cx - radius * 0.36, cy - radius * 0.4, radius * 0.5);
    gloss.addColorStop(0, "rgba(255,255,255,0.5)");
    gloss.addColorStop(1, "rgba(255,255,255,0)");
    sc.fillStyle = gloss;
    sc.beginPath();
    sc.ellipse(cx - radius * 0.24, cy - radius * 0.26, radius * 0.36, radius * 0.18, -0.62, 0, Math.PI * 2);
    sc.fill();
    sc.restore();

    drawOrbMark(sc, cx, cy, radius * 0.6, colorIndex);

    traceStonePath(sc, points, cx, cy, radius, 1.03);
    sc.strokeStyle = "rgba(1, 3, 7, 0.96)";
    sc.lineWidth = 4.4;
    sc.stroke();
    traceStonePath(sc, points, cx, cy, radius, 0.94);
    sc.strokeStyle = "rgba(255, 245, 218, 0.34)";
    sc.lineWidth = 1.3;
    sc.stroke();

    orbSpriteCache.set(colorIndex, sprite);
    return sprite;
  }

  function drawOrbMark(sc, cx, cy, r, colorIndex) {
    sc.save();
    sc.lineCap = "round";
    sc.lineJoin = "round";
    sc.shadowColor = "rgba(0, 0, 0, 0.54)";
    sc.shadowBlur = 3;
    sc.strokeStyle = "rgba(5, 8, 14, 0.72)";
    sc.fillStyle = "rgba(5, 8, 14, 0.66)";
    sc.lineWidth = Math.max(4, r * 0.18);
    if (colorIndex === 0) {
      sc.beginPath();
      sc.moveTo(cx + r * 0.42, cy - r * 0.34);
      sc.bezierCurveTo(cx + r * 0.05, cy - r * 0.52, cx - r * 0.5, cy - r * 0.26, cx - r * 0.5, cy + r * 0.12);
      sc.bezierCurveTo(cx - r * 0.48, cy + r * 0.52, cx + r * 0.02, cy + r * 0.68, cx + r * 0.38, cy + r * 0.34);
      sc.bezierCurveTo(cx + r * 0.06, cy + r * 0.42, cx - r * 0.18, cy + r * 0.16, cx - r * 0.06, cy - r * 0.08);
      sc.bezierCurveTo(cx + r * 0.04, cy - r * 0.26, cx + r * 0.22, cy - r * 0.3, cx + r * 0.42, cy - r * 0.34);
      sc.fill();
    } else if (colorIndex === 1) {
      sc.beginPath();
      sc.moveTo(cx - r * 0.5, cy + r * 0.16);
      sc.bezierCurveTo(cx - r * 0.22, cy - r * 0.42, cx + r * 0.08, cy + r * 0.32, cx + r * 0.48, cy - r * 0.1);
      sc.stroke();
      sc.lineWidth = Math.max(3, r * 0.13);
      sc.beginPath();
      sc.moveTo(cx - r * 0.38, cy + r * 0.38);
      sc.lineTo(cx + r * 0.4, cy + r * 0.38);
      sc.stroke();
    } else if (colorIndex === 2) {
      sc.beginPath();
      sc.ellipse(cx, cy, r * 0.38, r * 0.62, Math.PI / 4, 0, Math.PI * 2);
      sc.fill();
      sc.strokeStyle = "rgba(255,255,255,0.14)";
      sc.lineWidth = 2;
      sc.beginPath();
      sc.moveTo(cx - r * 0.2, cy + r * 0.28);
      sc.lineTo(cx + r * 0.25, cy - r * 0.28);
      sc.stroke();
    } else if (colorIndex === 3) {
      sc.beginPath();
      sc.arc(cx + r * 0.12, cy - r * 0.02, r * 0.46, Math.PI * 0.34, Math.PI * 1.68);
      sc.bezierCurveTo(cx + r * 0.18, cy + r * 0.25, cx + r * 0.18, cy - r * 0.25, cx + r * 0.12, cy - r * 0.48);
      sc.fill();
    } else if (colorIndex === 5) {
      // Heart mark: matches the heal orb so its purpose reads at a glance.
      sc.beginPath();
      sc.moveTo(cx, cy + r * 0.52);
      sc.bezierCurveTo(cx - r * 0.58, cy + r * 0.16, cx - r * 0.62, cy - r * 0.36, cx - r * 0.2, cy - r * 0.36);
      sc.bezierCurveTo(cx - r * 0.02, cy - r * 0.36, cx, cy - r * 0.2, cx, cy - r * 0.2);
      sc.bezierCurveTo(cx, cy - r * 0.2, cx + r * 0.02, cy - r * 0.36, cx + r * 0.2, cy - r * 0.36);
      sc.bezierCurveTo(cx + r * 0.62, cy - r * 0.36, cx + r * 0.58, cy + r * 0.16, cx, cy + r * 0.52);
      sc.fill();
    } else {
      // Dark (colorIndex 4): crescent mark.
      sc.beginPath();
      sc.arc(cx - r * 0.06, cy, r * 0.44, Math.PI * 0.32, Math.PI * 1.7);
      sc.arc(cx + r * 0.14, cy, r * 0.34, Math.PI * 1.66, Math.PI * 0.36, true);
      sc.closePath();
      sc.fill();
    }
    sc.restore();
  }
  function drawPushRipples() {
    if (!pushRipples.length) return;
    const now = performance.now();
    pushRipples = pushRipples.filter((ripple) => now - ripple.startedAt < 260);
    for (const ripple of pushRipples) {
      const progress = Math.min(1, (now - ripple.startedAt) / 260);
      const alpha = (1 - progress) * 0.48;
      context.save();
      context.strokeStyle = ripple.color;
      context.globalAlpha = alpha;
      context.lineWidth = 2 + progress * 3;
      context.shadowColor = ripple.color;
      context.shadowBlur = 12;
      context.beginPath();
      context.arc(ripple.x, ripple.y, CELL * (0.28 + progress * 0.2), 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }
  }
  function draw() {
    context.clearRect(0, 0, boardPxWidth, boardPxHeight);
    context.drawImage(getBackgroundCanvas(), 0, 0);
    drawPushRipples();

    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const gem = board[r][c];
        if (!gem) continue;
        if (dragging && dragging.heldId === gem.id && !keyboardHolding) continue;
        const sprite = getOrbSprite(gem.color);
        const position = getGemDrawPosition(gem, r, c);
        context.save();
        if (position.glow) {
          context.globalAlpha = Math.min(0.35, position.glow);
          context.fillStyle = COLORS[gem.color].glow;
          context.beginPath();
          context.arc(position.x, position.y, CELL * 0.43, 0, Math.PI * 2);
          context.fill();
          context.globalAlpha = 1;
        }
        context.translate(position.x, position.y);
        context.scale(position.scale || 1, position.scale || 1);
        context.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
        context.restore();
      }
    }

    if (dragging) {
      drawDragPath();
      drawHeldOrb();
    }
    if (cursorVisible) drawCursor();
    drawParticles();
    drawPopups();
  }

  function getGemDrawPosition(gem, r, c) {
    const targetX = c * CELL + CELL / 2;
    const targetY = r * CELL + CELL / 2;
    const animation = cellAnimations.get(gem.id);
    if (!animation) return { x: targetX, y: targetY, scale: 1, glow: 0 };
    const duration = animation.duration || SWAP_ANIMATION_MS;
    const progress = Math.min(1, (performance.now() - animation.startedAt) / duration);
    const eased = 1 - Math.pow(1 - progress, 4);
    const dx = targetX - animation.fromX;
    const dy = targetY - animation.fromY;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const push = Math.sin(progress * Math.PI) * 5.5;
    const settle = progress > 0.72 ? Math.sin((progress - 0.72) / 0.28 * Math.PI) * 2.5 : 0;
    if (progress >= 1) {
      cellAnimations.delete(gem.id);
      return { x: targetX, y: targetY, scale: 1, glow: 0 };
    }
    return {
      x: animation.fromX + dx * eased + (dx / distance) * push - (dx / distance) * settle,
      y: animation.fromY + dy * eased + (dy / distance) * push - (dy / distance) * settle,
      scale: 0.94 + Math.sin(progress * Math.PI) * 0.12,
      glow: Math.sin(progress * Math.PI) * 0.34
    };
  }

  function getHeldGem() {
    if (!dragging) return null;
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const gem = board[r][c];
        if (gem && gem.id === dragging.heldId) return gem;
      }
    }
    return null;
  }

  function drawHeldOrb() {
    if (!dragging || keyboardHolding) return;
    const gem = getHeldGem();
    if (!gem) return;
    const sprite = getOrbSprite(gem.color);
    const x = Number.isFinite(dragging.pointerX) ? dragging.pointerX : dragging.path[dragging.path.length - 1].c * CELL + CELL / 2;
    const y = Number.isFinite(dragging.pointerY) ? dragging.pointerY : dragging.path[dragging.path.length - 1].r * CELL + CELL / 2;
    context.save();
    context.globalAlpha = 0.98;
    context.shadowColor = COLORS[gem.color].glow;
    context.shadowBlur = 24;
    context.translate(x, y);
    context.scale(1.16, 1.16);
    context.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
    context.restore();
  }

  function drawDragPath() {
    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    dragging.path.forEach((cell, index) => {
      const x = cell.c * CELL + CELL / 2;
      const y = cell.r * CELL + CELL / 2;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    if (!keyboardHolding && Number.isFinite(dragging.pointerX) && Number.isFinite(dragging.pointerY)) {
      context.lineTo(dragging.pointerX, dragging.pointerY);
    }
    context.strokeStyle = "rgba(47, 215, 255, 0.24)";
    context.lineWidth = 12;
    context.shadowColor = "rgba(47, 215, 255, 0.72)";
    context.shadowBlur = 18;
    context.stroke();
    context.strokeStyle = "rgba(255, 244, 210, 0.92)";
    context.lineWidth = 3;
    context.shadowColor = "rgba(255, 216, 120, 0.58)";
    context.shadowBlur = 7;
    context.stroke();
    context.restore();

    const last = dragging.path[dragging.path.length - 1];
    context.save();
    context.strokeStyle = "rgba(255, 216, 120, 0.96)";
    context.lineWidth = 3;
    context.shadowColor = "rgba(255, 216, 120, 0.7)";
    context.shadowBlur = 10;
    context.strokeRect(last.c * CELL + 4, last.r * CELL + 4, CELL - 8, CELL - 8);
    context.restore();
  }

  function drawCursor() {
    context.strokeStyle = keyboardHolding ? "rgba(255,255,255,0.9)" : "rgba(47,215,255,0.75)";
    context.lineWidth = 2.4;
    context.setLineDash([4, 4]);
    context.strokeRect(cursor.c * CELL + 3, cursor.r * CELL + 3, CELL - 6, CELL - 6);
    context.setLineDash([]);
  }

  function spawnBurst(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 140;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 0,
        maxLife: 0.5 + Math.random() * 0.3
      });
    }
  }

  function announce(text, x, y, color) {
    popups.push({ x, y, text, color, life: 0, maxLife: 1.1 });
  }

  function updateParticles(delta) {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.life += delta;
      if (p.life >= p.maxLife) { particles.splice(i, 1); continue; }
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.vy += 200 * delta;
    }
    for (let i = popups.length - 1; i >= 0; i -= 1) {
      const p = popups[i];
      p.life += delta;
      if (p.life >= p.maxLife) popups.splice(i, 1);
    }
  }

  function drawParticles() {
    particles.forEach((p) => {
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      context.globalAlpha = alpha;
      context.fillStyle = p.color;
      context.shadowColor = p.color;
      context.shadowBlur = 8;
      context.beginPath();
      context.arc(p.x, p.y, 3, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
      context.shadowBlur = 0;
    });
  }

  function drawPopups() {
    popups.forEach((p) => {
      const t = p.life / p.maxLife;
      const alpha = Math.max(0, 1 - t);
      const y = p.y - t * 34;
      context.save();
      context.globalAlpha = alpha;
      context.font = "900 20px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.lineWidth = 3.5;
      context.strokeStyle = "rgba(5,18,24,0.75)";
      context.strokeText(p.text, p.x, y);
      context.fillStyle = p.color;
      context.fillText(p.text, p.x, y);
      context.restore();
    });
  }

  /* ---------- main loop (battery-conscious: idle stops rAF) ---------- */

  function needsContinuousRender() {
    return Boolean(dragging) || cellAnimations.size > 0 || pushRipples.length > 0 || particles.length > 0 || popups.length > 0;
  }

  function loop(time) {
    if (!running || paused) {
      animationFrameId = 0;
      return;
    }
    const delta = Math.min(0.05, (time - lastTime) / 1000 || 0);
    lastTime = time;
    updateParticles(delta);
    draw();
    animationFrameId = needsContinuousRender() ? requestAnimationFrame(loop) : 0;
  }

  function wake() {
    if (!running || paused || animationFrameId) return;
    lastTime = performance.now();
    animationFrameId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
    }
  }


  function clearStageEffect() {
    if (stageEffectTimer) {
      window.clearTimeout(stageEffectTimer);
      stageEffectTimer = 0;
    }
    if (stageFollowupTimer) {
      window.clearTimeout(stageFollowupTimer);
      stageFollowupTimer = 0;
    }
    enemyStageEl.classList.remove("is-hit", "is-attack", "is-defeated", "is-break", "is-spawn");
  }
  function combatImpactDelay() {
    return reducedMotionQuery?.matches ? REDUCED_MOTION_PROJECTILE_MS : COMBAT_PROJECTILE_MS;
  }

  function scheduleCombatTimeout(callback, delay) {
    const timer = window.setTimeout(() => {
      delayedCombatTimers.delete(timer);
      callback();
    }, Math.max(0, delay));
    delayedCombatTimers.add(timer);
    return timer;
  }

  function clearCombatProjectiles() {
    delayedCombatTimers.forEach((timer) => window.clearTimeout(timer));
    delayedCombatTimers.clear();
    battleStageEl?.querySelectorAll(".combat-projectile, .combat-impact").forEach((node) => node.remove());
  }

  function scheduleStageEffect(className, delay = 0, duration = 430) {
    scheduleCombatTimeout(() => {
      if (!running) return;
      playStageEffect(className, duration);
    }, delay);
  }

  function launchCombatProjectile(fromEl, toEl, variant = "player") {
    const delay = combatImpactDelay();
    if (!battleStageEl || !fromEl || !toEl) return delay;
    const stageRect = battleStageEl.getBoundingClientRect();
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    if (!stageRect.width || !stageRect.height || !fromRect.width || !toRect.width) return delay;

    const startX = fromRect.left - stageRect.left + fromRect.width * 0.5;
    const startY = fromRect.top - stageRect.top + fromRect.height * 0.46;
    const endX = toRect.left - stageRect.left + toRect.width * 0.5;
    const endY = toRect.top - stageRect.top + toRect.height * 0.46;

    const projectile = document.createElement("i");
    projectile.className = `combat-projectile is-${variant}`;
    projectile.setAttribute("aria-hidden", "true");
    projectile.style.left = `${startX}px`;
    projectile.style.top = `${startY}px`;
    projectile.style.setProperty("--fx-dx", `${endX - startX}px`);
    projectile.style.setProperty("--fx-dy", `${endY - startY}px`);
    projectile.style.setProperty("--fx-duration", `${delay}ms`);
    battleStageEl.append(projectile);

    scheduleCombatTimeout(() => {
      projectile.remove();
      const impact = document.createElement("i");
      impact.className = `combat-impact is-${variant}`;
      impact.setAttribute("aria-hidden", "true");
      impact.style.left = `${endX}px`;
      impact.style.top = `${endY}px`;
      battleStageEl.append(impact);
      scheduleCombatTimeout(() => impact.remove(), reducedMotionQuery?.matches ? 80 : 280);
    }, delay);

    return delay;
  }

  function playStageEffect(className, duration = 430) {
    clearStageEffect();
    enemyStageEl.classList.add(className);
    stageEffectTimer = window.setTimeout(() => {
      enemyStageEl.classList.remove(className);
      stageEffectTimer = 0;
    }, duration);
  }

  function queueStageEffect(className, delay = 0, duration = 430) {
    if (stageFollowupTimer) {
      window.clearTimeout(stageFollowupTimer);
    }
    stageFollowupTimer = window.setTimeout(() => {
      stageFollowupTimer = 0;
      playStageEffect(className, duration);
    }, delay);
  }

  function floatCombatText(text, type) {
    const item = document.createElement("span");
    item.textContent = text;
    if (type === "attack") item.className = "is-attack";
    if (type === "break") item.className = "is-break";
    combatFloatsEl.append(item);
    window.setTimeout(() => item.remove(), 950);
  }

  function playPlayerEffect(className, duration = 400) {
    if (!playerStageEl) return;
    if (playerEffectTimer) window.clearTimeout(playerEffectTimer);
    playerStageEl.classList.remove("is-attack", "is-hit", "is-heal", "is-level");
    // Force a reflow so re-triggering the same class restarts its animation.
    void playerStageEl.offsetWidth;
    playerStageEl.classList.add(className);
    playerEffectTimer = window.setTimeout(() => {
      playerStageEl.classList.remove(className);
      playerEffectTimer = 0;
    }, duration);
  }

  function floatPlayerText(text, className) {
    if (!playerFloatsEl) return;
    const item = document.createElement("span");
    item.textContent = text;
    item.className = className;
    playerFloatsEl.append(item);
    window.setTimeout(() => item.remove(), 900);
  }

  function showStoryToast(text, duration = 2400) {
    if (!storyToastEl || !text) return;
    if (storyToastTimer) window.clearTimeout(storyToastTimer);
    storyToastEl.textContent = text;
    storyToastEl.hidden = false;
    storyToastEl.classList.remove("is-show");
    void storyToastEl.offsetWidth;
    storyToastEl.classList.add("is-show");
    storyToastTimer = window.setTimeout(() => {
      storyToastEl.classList.remove("is-show");
      storyToastEl.hidden = true;
      storyToastTimer = 0;
    }, duration);
  }
  /* ---------- drag / swap mechanics ---------- */

  function swap(a, b) {
    const gemA = board[a.r][a.c];
    const gemB = board[b.r][b.c];
    board[a.r][a.c] = gemB;
    board[b.r][b.c] = gemA;
    animateGemMove(gemA, a, b);
    animateGemMove(gemB, b, a);
  }

  function animateGemMove(gem, from, to) {
    if (!gem) return;
    cellAnimations.set(gem.id, {
      fromX: from.c * CELL + CELL / 2,
      fromY: from.r * CELL + CELL / 2,
      toX: to.c * CELL + CELL / 2,
      toY: to.r * CELL + CELL / 2,
      startedAt: performance.now(),
      duration: SWAP_ANIMATION_MS
    });
  }

  function sameCell(a, b) {
    return a.r === b.r && a.c === b.c;
  }

  function isAdjacent8(a, b) {
    const dr = Math.abs(a.r - b.r);
    const dc = Math.abs(a.c - b.c);
    return dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0);
  }

  // Steps the held orb one cell toward `target`, supporting a one-step undo
  // back onto the previous path cell (mirrors the classic drag-swap feel).
  function stepToward(target) {
    if (!dragging) return;
    const current = dragging.path[dragging.path.length - 1];
    if (sameCell(current, target) || !inBounds(target.r, target.c)) return;
    const previous = dragging.path[dragging.path.length - 2];
    if (previous && sameCell(previous, target)) {
      swap(current, target);
      dragging.path.pop();
      return;
    }
    if (!isAdjacent8(current, target)) return;
    swap(current, target);
    dragging.path.push({ r: target.r, c: target.c });
  }

  // Handles fast swipes that jump multiple cells within a single move event
  // by stepping one cell at a time toward the target.
  function dragTo(target) {
    if (!dragging) return;
    let guard = 0;
    while (guard < 10) {
      const current = dragging.path[dragging.path.length - 1];
      if (sameCell(current, target)) break;
      const previous = dragging.path[dragging.path.length - 2];
      if (previous && sameCell(previous, target)) {
        stepToward(target);
        break;
      }
      const stepR = current.r + Math.sign(target.r - current.r);
      const stepC = current.c + Math.sign(target.c - current.c);
      stepToward({ r: stepR, c: stepC });
      guard += 1;
    }
  }

  function getPointerPosition(event) {
    const rect = boardCanvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (boardPxWidth / rect.width),
      y: (event.clientY - rect.top) * (boardPxHeight / rect.height)
    };
  }

  function getCellFromPointer(event) {
    const point = getPointerPosition(event);
    const c = Math.floor(point.x / CELL);
    const r = Math.floor(point.y / CELL);
    if (!inBounds(r, c)) return null;
    return { r, c, pointerX: point.x, pointerY: point.y };
  }

  // Any interruption mid-drag (second pointer, cancelled gesture, tab hide,
  // switching to keyboard input) must resolve the swaps already made rather
  // than silently discard them — otherwise a matched board can sit unresolved
  // (confusing after a stray touch) or, worse, be repeatedly set up and
  // abandoned to dodge the enemy's counterattack entirely.
  function settleActiveDrag() {
    if (!dragging) return true;
    const pathLength = dragging.path.length - 1;
    finalizeTurn(pathLength);
    return running && !paused;
  }

  boardCanvas.addEventListener("pointerdown", (event) => {
    if (!running || paused) return;
    const cell = getCellFromPointer(event);
    if (!cell) return;
    event.preventDefault();
    if (!settleActiveDrag()) return;
    const heldGem = board[cell.r][cell.c];
    dragging = { path: [{ r: cell.r, c: cell.c }], pointerId: event.pointerId, heldId: heldGem.id, pointerX: cell.pointerX, pointerY: cell.pointerY };
    cursorVisible = false;
    try { boardCanvas.setPointerCapture?.(event.pointerId); } catch {
      // Ignore pointer capture failures from interrupted gestures.
    }
    draw();
    wake();
  }, { passive: false });

  boardCanvas.addEventListener("pointermove", (event) => {
    if (!dragging || event.pointerId !== dragging.pointerId) return;
    if (!running || paused) { settleActiveDrag(); return; }
    event.preventDefault();
    const cell = getCellFromPointer(event);
    if (cell) {
      dragging.pointerX = cell.pointerX;
      dragging.pointerY = cell.pointerY;
      dragTo({ r: cell.r, c: cell.c });
    } else {
      const point = getPointerPosition(event);
      dragging.pointerX = point.x;
      dragging.pointerY = point.y;
    }
    draw();
  }, { passive: false });

  boardCanvas.addEventListener("pointerup", (event) => {
    if (!dragging || event.pointerId !== dragging.pointerId) return;
    event.preventDefault();
    try { boardCanvas.releasePointerCapture?.(event.pointerId); } catch {
      // Ignore if the pointer was not captured.
    }
    finalizeTurn(dragging.path.length - 1);
  }, { passive: false });

  boardCanvas.addEventListener("pointercancel", (event) => {
    if (dragging && event.pointerId === dragging.pointerId) settleActiveDrag();
  });

  /* ---------- keyboard input ---------- */

  document.addEventListener("keydown", (event) => {
    if (event.target?.tagName === "INPUT" || event.target?.tagName === "TEXTAREA") return;
    if (isInstructionOpen()) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        closeInstruction(true);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closeInstruction(false);
      }
      return;
    }

    const key = event.key;
    if (!running) {
      if (key === " " || key === "Enter") {
        event.preventDefault();
        startGame();
      }
      return;
    }
    if (paused) {
      if (key === " " || key === "Enter" || key === "p" || key === "P") {
        event.preventDefault();
        togglePause();
      }
      return;
    }

    let handled = true;
    if (key === "ArrowUp") cursor = { r: Math.max(0, cursor.r - 1), c: cursor.c };
    else if (key === "ArrowDown") cursor = { r: Math.min(ROWS - 1, cursor.r + 1), c: cursor.c };
    else if (key === "ArrowLeft") cursor = { r: cursor.r, c: Math.max(0, cursor.c - 1) };
    else if (key === "ArrowRight") cursor = { r: cursor.r, c: Math.min(COLS - 1, cursor.c + 1) };
    else if (key === " " || key === "Enter") {
      if (!keyboardHolding) {
        if (!settleActiveDrag()) return;
        keyboardHolding = true;
        const heldGem = board[cursor.r][cursor.c];
        dragging = { path: [{ r: cursor.r, c: cursor.c }], pointerId: -1, heldId: heldGem.id, pointerX: null, pointerY: null };
      } else {
        finalizeTurn(dragging ? dragging.path.length - 1 : 0);
      }
    } else if (key === "p" || key === "P") {
      togglePause();
    } else if (key === "r" || key === "R") {
      restartGame();
    } else {
      handled = false;
    }

    if (handled) {
      if (keyboardHolding && dragging && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
        stepToward(cursor);
      }
      cursorVisible = true;
      event.preventDefault();
      draw();
      wake();
    }
  });

  /* ---------- overlay / instructions / buttons ---------- */

  function showOverlay(title, message, buttonText) {
    overlayTitle.textContent = title;
    overlayMessage.textContent = message;
    overlay.querySelector("[data-action='overlay-start']").textContent = buttonText;
    overlay.hidden = false;
  }

  function hideOverlay() {
    overlay.hidden = true;
  }

  function isInstructionOpen() {
    return Boolean(instructionModal && !instructionModal.hidden);
  }

  function openInstruction() {
    if (instructionModal) instructionModal.hidden = false;
  }

  function closeInstruction(shouldStart) {
    if (instructionModal) instructionModal.hidden = true;
    if (shouldStart && !running) startGame();
  }

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (action === "instructions") openInstruction();
      else if (action === "start" || action === "overlay-start") {
        if (!running) startGame();
        else if (paused) togglePause();
      } else if (action === "pause") togglePause();
      else if (action === "restart") restartGame();
    });
  });

  document.querySelector("[data-instruction-start]")?.addEventListener("click", () => closeInstruction(true));
  document.querySelector("[data-instruction-close]")?.addEventListener("click", () => closeInstruction(false));

  /* ---------- UI updates ---------- */

  function setUiText(element, key, value) {
    if (!element || uiCache[key] === value) return;
    uiCache[key] = value;
    element.textContent = value;
  }

  function setBarWidth(element, key, percent) {
    if (!element) return;
    const value = `${Math.max(0, Math.min(100, percent))}%`;
    if (uiCache[key] === value) return;
    uiCache[key] = value;
    element.style.width = value;
  }

  function updateTimerUi() {
    const timeText = String(Math.max(0, timeLeft));
    setUiText(timeEl, "time", timeText);
    setUiText(battleTimeEl, "battleTime", timeText);
    timeEl?.classList.toggle("is-low", timeLeft <= 10);
    battleTimerEl?.classList.toggle("is-low", timeLeft <= 10);
  }

  function updateUi() {
    setUiText(scoreEl, "score", String(score));
    setUiText(bestEl, "best", String(best));
    setUiText(waveEl, "wave", String(wave));
    setUiText(playsEl, "plays", String(plays));
    updateTimerUi();

    setUiText(playerHpEl, "playerHp", `${Math.max(0, playerHp)}/${playerMaxHp}`);
    setUiText(playerLevelEl, "playerLevel", `Lv.${playerLevel}`);
    const playerHpPct = playerMaxHp > 0 ? playerHp / playerMaxHp : 0;
    setBarWidth(playerHpTrack, "playerHpPct", playerHpPct * 100);
    playerHpCardEl?.classList.toggle("is-low", playerHpPct > 0 && playerHpPct <= 0.25);
    playerHpCardEl?.classList.toggle("is-critical", playerHpPct > 0 && playerHpPct <= 0.2);
    playerStageEl?.classList.toggle("is-critical", playerHpPct > 0 && playerHpPct <= 0.2);

    if (enemy) {
      setUiText(enemyNameEl, "enemyName", `第 ${wave} 波・${enemy.name}`);
      setUiText(enemyHpEl, "enemyHp", `${Math.max(0, enemy.hp)}/${enemy.maxHp}`);
      const enemyHpPct = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
      setBarWidth(enemyHpTrack, "enemyHpPct", enemyHpPct * 100);
      enemyHpCardEl?.classList.toggle("is-low", enemyHpPct > 0 && enemyHpPct <= 0.25);
      enemyHpCardEl?.classList.toggle("is-critical", enemyHpPct > 0 && enemyHpPct <= 0.2);
      setUiText(enemyBadgeEl, "enemyBadge", enemy.name);
      setUiText(enemyAtkEl, "enemyAtk", `ATK ${enemy.atk}`);
      const artSrc = enemyArtSrc(enemy.art);
      if (enemyImageEl.getAttribute("src") !== artSrc) enemyImageEl.setAttribute("src", artSrc);
      if (enemyImageEl.alt !== `${enemy.name} 敵人圖像`) enemyImageEl.alt = `${enemy.name} 敵人圖像`;
      const tierClass = `tier-${enemy.tier}`;
      if (uiCache.enemyTierClass !== tierClass) {
        uiCache.enemyTierClass = tierClass;
        enemyImageEl.classList.remove("tier-1", "tier-2", "tier-3");
        enemyBadgeEl.classList.remove("tier-1", "tier-2", "tier-3");
        if (enemy.tier > 0) {
          enemyImageEl.classList.add(tierClass);
          enemyBadgeEl.classList.add(tierClass);
        }
      }
    }
  }

  /* ---------- cleanup ---------- */

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && running && !paused) togglePause();
  });

  window.addEventListener("pagehide", () => {
    if (running && !recordedThisRun) {
      recordedThisRun = true;
      recordFinishedRun(false);
    }
    stopTimer();
    stopLoop();
  });
})();
