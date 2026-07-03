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
  const enemyHpEl = document.querySelector("[data-enemy-hp]");
  const enemyHpTrack = document.querySelector("[data-enemy-hp-track]");
  const enemyNameEl = document.querySelector("[data-enemy-name]");
  const enemyStageEl = document.querySelector("[data-enemy-stage]");
  const enemyImageEl = document.querySelector("[data-enemy-image]");
  const enemyBadgeEl = document.querySelector("[data-enemy-badge]");
  const enemyAtkEl = document.querySelector("[data-enemy-atk]");
  const combatFloatsEl = document.querySelector("[data-combat-floats]");
  const instructionModal = document.querySelector("[data-instruction-modal]");
  const portalStats = window.MicroglowGameStats;

  const gameId = "microglow-orbs";
  const gameTitle = "微光連珠對戰";

  const COLS = 6;
  const ROWS = 5;
  const CELL = 62;
  const boardPxWidth = COLS * CELL;
  const boardPxHeight = ROWS * CELL;

  const COLORS = [
    { id: 0, name: "fire", fill: "#ff5ebc", glow: "rgba(255, 94, 188, 0.55)", mark: "#fff3fb" },
    { id: 1, name: "water", fill: "#2fd7ff", glow: "rgba(47, 215, 255, 0.55)", mark: "#e8fbff" },
    { id: 2, name: "wood", fill: "#8df45f", glow: "rgba(141, 244, 95, 0.55)", mark: "#f1ffe8" },
    { id: 3, name: "light", fill: "#ffd84d", glow: "rgba(255, 216, 77, 0.55)", mark: "#fff9d6" },
    { id: 4, name: "dark", fill: "#9b6bff", glow: "rgba(155, 107, 255, 0.55)", mark: "#efe8ff" }
  ];

  const ENEMIES = [
    { name: "濁光史萊姆", art: "slime.svg" },
    { name: "微光哨兵", art: "sentinel.svg" },
    { name: "霓虹守衛", art: "guardian.svg" },
    { name: "脈衝魔像", art: "golem.svg" },
    { name: "幻影守門者", art: "phantom.svg" },
    { name: "深淵行者", art: "abyss.svg" },
    { name: "共鳴巨獸", art: "beast.svg" }
  ];

  const BASE_ORB_DAMAGE = 16;
  const COMBO_BONUS = 0.18;
  const PLAYER_MAX_HP = 800;
  const START_TIME = 75;
  const MAX_TIME = 99;

  let board = [];
  let score = 0;
  let best = 0;
  let plays = 0;
  let bestWave = 0;
  let wave = 1;
  let playerHp = PLAYER_MAX_HP;
  let enemy = null;
  let timeLeft = START_TIME;
  let running = false;
  let paused = false;
  let recordedThisRun = false;
  let dragging = null; // { path: [{r,c}], pointerId }
  let cursor = { r: 2, c: 2 };
  let cursorVisible = false;
  let keyboardHolding = false;
  let particles = [];
  let popups = [];
  let animationFrameId = 0;
  let lastTime = 0;
  let timerHandle = 0;
  let backgroundCanvas = null;
  let stageEffectTimer = 0;
  const orbSpriteCache = new Map();

  const uiCache = {};

  ensurePortalStats();
  best = readBestScore();
  plays = readPlays();
  bestWave = readBestWave();

  initBoard();
  updateUi();
  draw();
  showOverlay("準備開戰", "拖曳任意路徑連接 3 顆以上同色元素珠攻擊敵人，時間耗盡或血量歸零則結束。", "開始遊戲");

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

  function ensurePortalStats() {
    portalStats.ensureGame(gameId, gameTitle, { bestWave: 0 });
  }

  function writePortalStats(lastScore, bestScore, bestWaveThisRun) {
    return portalStats.recordRun(gameId, gameTitle, lastScore, bestScore, { bestWave: bestWaveThisRun });
  }

  /* ---------- board setup ---------- */

  function randomColor() {
    return Math.floor(Math.random() * COLORS.length);
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
        row.push({ color });
      }
      board.push(row);
    }
  }

  function makeEnemy(waveNumber) {
    const template = ENEMIES[(waveNumber - 1) % ENEMIES.length];
    const hp = 120 + (waveNumber - 1) * 55;
    const atk = 24 + (waveNumber - 1) * 4;
    return { ...template, hp, maxHp: hp, atk };
  }

  function timeBonusForWave(waveNumber) {
    return Math.max(4, 9 - Math.floor(waveNumber / 6));
  }

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
        board[r][c] = { color: randomColor() };
      }
    }
  }

  // Runs the full chain synchronously (no per-step animation delay) so a
  // finished turn always resolves before the enemy counterattacks — this also
  // keeps the core combat logic independent of requestAnimationFrame timing.
  function resolveBoard() {
    let totalDamage = 0;
    let comboCount = 0;
    for (;;) {
      const matches = findMatches();
      if (!matches.size) break;
      comboCount += 1;
      totalDamage += matches.size * BASE_ORB_DAMAGE;
      eliminateCells(matches);
      applyGravityAndRefill();
    }
    if (comboCount > 1) totalDamage = Math.round(totalDamage * (1 + COMBO_BONUS * (comboCount - 1)));
    return { totalDamage, comboCount };
  }

  /* ---------- turn & combat flow ---------- */

  function finalizeTurn(pathLength) {
    dragging = null;
    cursorVisible = false;
    keyboardHolding = false;
    if (!running || paused || pathLength <= 0) {
      draw();
      return;
    }

    const result = resolveBoard();
    if (result.totalDamage > 0) {
      dealDamageToEnemy(result.totalDamage, result.comboCount);
    }
    if (running && enemy && enemy.hp > 0) {
      enemyAttack();
    }
    checkEnd();
    updateUi();
    draw();
    wake();
  }

  function dealDamageToEnemy(damage, comboCount) {
    score += damage;
    enemy.hp = Math.max(0, enemy.hp - damage);
    playStageEffect("is-hit");
    floatCombatText(`${comboCount > 1 ? `COMBO x${comboCount} ` : ""}-${damage}`, "damage");
    announce(`${comboCount > 1 ? `連段 x${comboCount} ` : ""}-${damage}`, boardPxWidth / 2, boardPxHeight * 0.32, "#ffd84d");
    if (enemy.hp <= 0) {
      floatCombatText("擊破", "break");
      wave += 1;
      timeLeft = Math.min(MAX_TIME, timeLeft + timeBonusForWave(wave));
      enemy = makeEnemy(wave);
      announce("擊破！下一波來襲", boardPxWidth / 2, boardPxHeight * 0.5, "#8df45f");
    }
  }

  function enemyAttack() {
    playerHp = Math.max(0, playerHp - enemy.atk);
    playStageEffect("is-attack");
    floatCombatText(`-${enemy.atk}`, "attack");
    announce(`-${enemy.atk}`, boardPxWidth / 2, boardPxHeight * 0.7, "#ff5ebc");
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
    playerHp = PLAYER_MAX_HP;
    enemy = makeEnemy(1);
    timeLeft = START_TIME;
    dragging = null;
    particles = [];
    popups = [];
    clearStageEffect();
    combatFloatsEl.replaceChildren();
    initBoard();
    hideOverlay();
    updateUi();
    draw();
    startTimer();
    wake();
  }

  function restartGame() {
    if (running && !recordedThisRun) {
      recordedThisRun = true;
      const result = writePortalStats(score, Math.max(best, score), Math.max(bestWave, wave));
      plays = result.plays;
      best = result.bestScore;
      bestWave = result.bestWave;
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
    clearStageEffect();
    const result = writePortalStats(score, Math.max(best, score), Math.max(bestWave, wave));
    plays = result.plays;
    best = result.bestScore;
    bestWave = result.bestWave;
    updateUi();
    draw();
    showOverlay(title, `${message}，本局分數 ${score}，抵達第 ${wave} 波，最高分 ${best}`, "再玩一次");
  }

  function togglePause() {
    if (!running) {
      startGame();
      return;
    }
    paused = !paused;
    if (paused) {
      dragging = null;
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
    const glow = bg.createRadialGradient(
      boardPxWidth * 0.3, boardPxHeight * 0.2, 10,
      boardPxWidth * 0.5, boardPxHeight * 0.5, boardPxWidth * 0.9
    );
    glow.addColorStop(0, "rgba(47, 215, 255, 0.14)");
    glow.addColorStop(1, "rgba(6, 18, 24, 0.98)");
    bg.fillStyle = glow;
    bg.fillRect(0, 0, boardPxWidth, boardPxHeight);
    bg.strokeStyle = "rgba(147, 244, 255, 0.12)";
    bg.lineWidth = 1;
    bg.beginPath();
    for (let i = 0; i <= COLS; i += 1) {
      bg.moveTo(i * CELL, 0);
      bg.lineTo(i * CELL, boardPxHeight);
    }
    for (let i = 0; i <= ROWS; i += 1) {
      bg.moveTo(0, i * CELL);
      bg.lineTo(boardPxWidth, i * CELL);
    }
    bg.stroke();
    return backgroundCanvas;
  }

  function getOrbSprite(colorIndex) {
    let sprite = orbSpriteCache.get(colorIndex);
    if (sprite) return sprite;
    const color = COLORS[colorIndex];
    const r = CELL * 0.36;
    const pad = 16;
    sprite = document.createElement("canvas");
    sprite.width = r * 2 + pad * 2;
    sprite.height = r * 2 + pad * 2;
    const sc = sprite.getContext("2d");
    const cx = sprite.width / 2;
    const cy = sprite.height / 2;
    sc.shadowColor = color.glow;
    sc.shadowBlur = 14;
    const fill = sc.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
    fill.addColorStop(0, "#ffffff");
    fill.addColorStop(0.24, color.fill);
    fill.addColorStop(1, "rgba(5,18,24,0.7)");
    sc.fillStyle = fill;
    sc.beginPath();
    sc.arc(cx, cy, r, 0, Math.PI * 2);
    sc.fill();
    sc.shadowBlur = 0;
    sc.strokeStyle = "rgba(255,255,255,0.5)";
    sc.lineWidth = 1.6;
    sc.stroke();
    drawOrbMark(sc, cx, cy, r, colorIndex);
    orbSpriteCache.set(colorIndex, sprite);
    return sprite;
  }


  function drawOrbMark(sc, cx, cy, r, colorIndex) {
    sc.save();
    sc.strokeStyle = COLORS[colorIndex].mark;
    sc.fillStyle = COLORS[colorIndex].mark;
    sc.lineWidth = Math.max(3, r * 0.12);
    sc.lineCap = "round";
    sc.lineJoin = "round";
    sc.shadowColor = "rgba(0,0,0,0.32)";
    sc.shadowBlur = 2;
    if (colorIndex === 0) {
      sc.beginPath();
      sc.moveTo(cx, cy - r * 0.52);
      sc.bezierCurveTo(cx - r * 0.5, cy - r * 0.08, cx - r * 0.2, cy + r * 0.42, cx, cy + r * 0.48);
      sc.bezierCurveTo(cx + r * 0.42, cy + r * 0.18, cx + r * 0.34, cy - r * 0.28, cx, cy - r * 0.52);
      sc.fill();
    } else if (colorIndex === 1) {
      sc.beginPath();
      sc.moveTo(cx - r * 0.5, cy + r * 0.04);
      sc.bezierCurveTo(cx - r * 0.26, cy - r * 0.28, cx - r * 0.05, cy + r * 0.3, cx + r * 0.18, cy);
      sc.bezierCurveTo(cx + r * 0.34, cy - r * 0.18, cx + r * 0.45, cy - r * 0.12, cx + r * 0.56, cy - r * 0.02);
      sc.stroke();
      sc.beginPath();
      sc.moveTo(cx - r * 0.42, cy + r * 0.28);
      sc.lineTo(cx + r * 0.42, cy + r * 0.28);
      sc.stroke();
    } else if (colorIndex === 2) {
      sc.beginPath();
      sc.ellipse(cx, cy, r * 0.36, r * 0.55, Math.PI / 4, 0, Math.PI * 2);
      sc.fill();
      sc.strokeStyle = "rgba(5,18,24,0.35)";
      sc.lineWidth = 2;
      sc.beginPath();
      sc.moveTo(cx - r * 0.18, cy + r * 0.2);
      sc.lineTo(cx + r * 0.22, cy - r * 0.24);
      sc.stroke();
    } else if (colorIndex === 3) {
      sc.beginPath();
      for (let i = 0; i < 8; i += 1) {
        const angle = -Math.PI / 2 + i * Math.PI / 4;
        const radius = i % 2 === 0 ? r * 0.56 : r * 0.24;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        if (i === 0) sc.moveTo(x, y);
        else sc.lineTo(x, y);
      }
      sc.closePath();
      sc.fill();
    } else {
      sc.beginPath();
      sc.arc(cx + r * 0.08, cy, r * 0.46, Math.PI * 0.32, Math.PI * 1.68);
      sc.bezierCurveTo(cx + r * 0.18, cy + r * 0.26, cx + r * 0.18, cy - r * 0.26, cx + r * 0.08, cy - r * 0.46);
      sc.fill();
    }
    sc.restore();
  }
  function draw() {
    context.clearRect(0, 0, boardPxWidth, boardPxHeight);
    context.drawImage(getBackgroundCanvas(), 0, 0);

    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const gem = board[r][c];
        if (!gem) continue;
        const sprite = getOrbSprite(gem.color);
        const x = c * CELL + CELL / 2 - sprite.width / 2;
        const y = r * CELL + CELL / 2 - sprite.height / 2;
        context.drawImage(sprite, x, y);
      }
    }

    if (dragging) drawDragPath();
    if (cursorVisible) drawCursor();
    drawParticles();
    drawPopups();
  }

  function drawDragPath() {
    context.save();
    context.strokeStyle = "rgba(255,255,255,0.55)";
    context.lineWidth = 4;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    dragging.path.forEach((cell, index) => {
      const x = cell.c * CELL + CELL / 2;
      const y = cell.r * CELL + CELL / 2;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();
    context.restore();

    const last = dragging.path[dragging.path.length - 1];
    context.strokeStyle = "rgba(255,255,255,0.9)";
    context.lineWidth = 3;
    context.setLineDash([]);
    context.strokeRect(last.c * CELL + 3, last.r * CELL + 3, CELL - 6, CELL - 6);
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
    return Boolean(dragging) || particles.length > 0 || popups.length > 0;
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
    enemyStageEl.classList.remove("is-hit", "is-attack", "is-defeated");
  }

  function playStageEffect(className, duration = 430) {
    clearStageEffect();
    enemyStageEl.classList.add(className);
    stageEffectTimer = window.setTimeout(() => {
      enemyStageEl.classList.remove(className);
      stageEffectTimer = 0;
    }, duration);
  }

  function floatCombatText(text, type) {
    const item = document.createElement("span");
    item.textContent = text;
    if (type === "attack") item.className = "is-attack";
    if (type === "break") item.className = "is-break";
    combatFloatsEl.append(item);
    window.setTimeout(() => item.remove(), 950);
  }
  /* ---------- drag / swap mechanics ---------- */

  function swap(a, b) {
    const tmp = board[a.r][a.c];
    board[a.r][a.c] = board[b.r][b.c];
    board[b.r][b.c] = tmp;
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

  function getCellFromPointer(event) {
    const rect = boardCanvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (boardPxWidth / rect.width);
    const y = (event.clientY - rect.top) * (boardPxHeight / rect.height);
    const c = Math.floor(x / CELL);
    const r = Math.floor(y / CELL);
    if (!inBounds(r, c)) return null;
    return { r, c };
  }

  boardCanvas.addEventListener("pointerdown", (event) => {
    if (!running || paused) return;
    const cell = getCellFromPointer(event);
    if (!cell) return;
    event.preventDefault();
    dragging = { path: [cell], pointerId: event.pointerId };
    cursorVisible = false;
    try { boardCanvas.setPointerCapture?.(event.pointerId); } catch {
      // Ignore pointer capture failures from interrupted gestures.
    }
    draw();
    wake();
  }, { passive: false });

  boardCanvas.addEventListener("pointermove", (event) => {
    if (!dragging || event.pointerId !== dragging.pointerId) return;
    if (!running || paused) { dragging = null; return; }
    event.preventDefault();
    const cell = getCellFromPointer(event);
    if (cell) dragTo(cell);
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

  boardCanvas.addEventListener("pointercancel", () => {
    if (dragging) finalizeTurn(0);
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
        keyboardHolding = true;
        dragging = { path: [{ r: cursor.r, c: cursor.c }], pointerId: -1 };
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
    setUiText(timeEl, "time", String(Math.max(0, timeLeft)));
  }

  function updateUi() {
    setUiText(scoreEl, "score", String(score));
    setUiText(bestEl, "best", String(best));
    setUiText(waveEl, "wave", String(wave));
    setUiText(playsEl, "plays", String(plays));
    updateTimerUi();

    setUiText(playerHpEl, "playerHp", `${Math.max(0, playerHp)}/${PLAYER_MAX_HP}`);
    setBarWidth(playerHpTrack, "playerHpPct", (playerHp / PLAYER_MAX_HP) * 100);

    if (enemy) {
      setUiText(enemyNameEl, "enemyName", `第 ${wave} 波・${enemy.name}`);
      setUiText(enemyHpEl, "enemyHp", `${Math.max(0, enemy.hp)}/${enemy.maxHp}`);
      setBarWidth(enemyHpTrack, "enemyHpPct", (enemy.hp / enemy.maxHp) * 100);
      setUiText(enemyBadgeEl, "enemyBadge", enemy.name);
      setUiText(enemyAtkEl, "enemyAtk", `ATK ${enemy.atk}`);
      const artSrc = `./assets/monsters/${enemy.art}`;
      if (enemyImageEl.getAttribute("src") !== artSrc) enemyImageEl.setAttribute("src", artSrc);
      if (enemyImageEl.alt !== `${enemy.name} 敵人圖像`) enemyImageEl.alt = `${enemy.name} 敵人圖像`;
    }
  }

  /* ---------- cleanup ---------- */

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && running && !paused) togglePause();
  });

  window.addEventListener("pagehide", () => {
    if (running && !recordedThisRun) {
      recordedThisRun = true;
      writePortalStats(score, Math.max(best, score), Math.max(bestWave, wave));
    }
    stopTimer();
    stopLoop();
  });
})();
