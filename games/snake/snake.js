(function () {
  const boardCanvas = document.querySelector("#snakeBoard");
  const context = boardCanvas.getContext("2d");
  const overlay = document.querySelector("[data-overlay]");
  const overlayTitle = document.querySelector("[data-overlay-title]");
  const overlayMessage = document.querySelector("[data-overlay-message]");
  const scoreEl = document.querySelector("[data-score]");
  const bestEl = document.querySelector("[data-best]");
  const lengthEl = document.querySelector("[data-length]");
  const playsEl = document.querySelector("[data-plays]");
  const gameShell = document.querySelector(".snake-shell");
  const instructionModal = document.querySelector("[data-instruction-modal]");
  const gameId = "microglow-snake";
  const gameTitle = "微光貪吃蛇";
  const portalStats = window.MicroglowGameStats;
  const boardSize = boardCanvas.width;
  const baseSpeed = 118;
  const turnRate = 5.2;
  const pointSpacing = 4.8;
  const headRadius = 10;
  const bodyRadius = 8;
  const foodRadius = 6;
  const foodCount = 18;

  const keys = {
    ArrowUp: -Math.PI / 2,
    up: -Math.PI / 2,
    w: -Math.PI / 2,
    W: -Math.PI / 2,
    ArrowDown: Math.PI / 2,
    down: Math.PI / 2,
    s: Math.PI / 2,
    S: Math.PI / 2,
    ArrowLeft: Math.PI,
    left: Math.PI,
    a: Math.PI,
    A: Math.PI,
    ArrowRight: 0,
    right: 0,
    d: 0,
    D: 0
  };

  let head = { x: boardSize / 2, y: boardSize / 2 };
  let snake = [];
  let foods = [];
  let particles = [];
  let angle = 0;
  let targetAngle = 0;
  let targetPoint = null;
  let score = 0;
  ensurePortalStats();
  let best = readBestScore();
  let plays = readPlays();
  let targetLength = 210;
  let running = false;
  let paused = false;
  let hasControl = false;
  let recordedThisRun = false;
  let animationFrameId = 0;
  let lastTime = 0;
  let distanceSincePoint = 0;
  let touchStart = null;
  let lastTouchEnd = 0;
  let backgroundCanvas = null;
  const glowSpriteCache = new Map();
  const glowSpriteRadius = 16;
  // Writing textContent forces a style recalc, so updateUi() skips values that
  // haven't changed — this runs every animation frame.
  const uiCache = {};

  resetState();
  updateUi();
  draw();

  function resetState() {
    head = { x: boardSize / 2, y: boardSize / 2 };
    angle = 0;
    targetAngle = 0;
    targetPoint = null;
    targetLength = 210;
    score = 0;
    paused = false;
    hasControl = false;
    recordedThisRun = false;
    distanceSincePoint = 0;
    snake = [];
    for (let index = 0; index < targetLength / pointSpacing; index += 1) {
      snake.push({
        x: head.x - index * pointSpacing,
        y: head.y,
        hue: index
      });
    }
    foods = Array.from({ length: foodCount }, createFood);
    particles = [];
  }

  function startGame() {
    if (running && paused) {
      togglePause();
      return;
    }

    if (running) return;

    resetState();
    running = true;
    hideOverlay();
    updateUi();
    lastTime = performance.now();
    animationFrameId = requestAnimationFrame(update);
  }

  function restartGame() {
    stopLoop();
    running = false;
    startGame();
  }

  function stopLoop() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
    }
  }

  function update(time) {
    if (!running) return;
    const delta = Math.min(0.034, (time - lastTime) / 1000 || 0);
    lastTime = time;

    if (!paused) {
      if (hasControl) {
        moveSnake(delta);
        eatFood();
        if (hitsSelf()) {
          endGame();
          return;
        }
      }
      updateParticles(delta);
      updateUi();
      draw();
    }

    animationFrameId = requestAnimationFrame(update);
  }

  function moveSnake(delta) {
    updateTargetAngle();
    angle = turnToward(angle, targetAngle, turnRate * delta);
    const currentSpeed = baseSpeed + Math.min(42, score * 0.22);
    const distance = currentSpeed * delta;
    head.x = wrap(head.x + Math.cos(angle) * distance);
    head.y = wrap(head.y + Math.sin(angle) * distance);
    distanceSincePoint += distance;

    if (distanceSincePoint >= pointSpacing) {
      snake.unshift({
        x: head.x,
        y: head.y,
        hue: score + snake.length
      });
      distanceSincePoint = 0;
    } else if (snake[0]) {
      snake[0].x = head.x;
      snake[0].y = head.y;
    }

    trimSnake();
  }

  function updateTargetAngle() {
    if (!targetPoint) return;
    targetAngle = Math.atan2(shortestDelta(targetPoint.y, head.y), shortestDelta(targetPoint.x, head.x));
  }

  function turnToward(current, target, maxTurn) {
    const difference = normalizeAngle(target - current);
    const turn = clamp(difference, -maxTurn, maxTurn);
    return normalizeAngle(current + turn);
  }

  function trimSnake() {
    const maxPoints = Math.max(12, Math.ceil(targetLength / pointSpacing));
    while (snake.length > maxPoints) {
      snake.pop();
    }
  }

  function eatFood() {
    const eatDistance = headRadius + foodRadius + 4;
    for (let index = foods.length - 1; index >= 0; index -= 1) {
      const food = foods[index];
      if (directDistanceBetween(head, food) <= eatDistance) {
        score += 10;
        targetLength += 34;
        spawnParticles(food.x, food.y, food.color);
        foods.splice(index, 1, createFood());
      }
    }
  }

  function hitsSelf() {
    if (snake.length < 42) return false;
    for (let index = 34; index < snake.length; index += 3) {
      if (directDistanceBetween(head, snake[index]) < headRadius + bodyRadius * 0.72) {
        return true;
      }
    }
    return false;
  }

  function endGame() {
    if (recordedThisRun) return;
    recordedThisRun = true;
    running = false;
    paused = false;
    stopLoop();
    snake.forEach((part, index) => {
      if (index % 3 === 0) spawnParticles(part.x, part.y, index < 18 ? "#2fd7ff" : "#8df45f", 2);
    });
    best = Math.max(best, score);
    plays = writePortalStats(score, best).plays;
    updateUi();
    draw();
    showOverlay("遊戲結束", `本局 ${score} 分，最高分 ${best} 分`, "再玩一次");
  }

  function togglePause() {
    if (!running) {
      startGame();
      return;
    }

    paused = !paused;
    if (paused) {
      stopLoop();
      showOverlay("已暫停", "按空白鍵、繼續或開始按鈕回到遊戲", "繼續遊戲");
    } else {
      hideOverlay();
      lastTime = performance.now();
      animationFrameId = requestAnimationFrame(update);
    }
  }

  function createFood() {
    const palette = ["#ff5ebc", "#ffd84d", "#8df45f", "#2fd7ff"];
    let food = null;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      food = {
        x: 24 + Math.random() * (boardSize - 48),
        y: 24 + Math.random() * (boardSize - 48),
        color: palette[Math.floor(Math.random() * palette.length)],
        pulse: Math.random() * Math.PI * 2
      };
      if (directDistanceBetween(food, head) > 72) return food;
    }
    return {
      x: head.x > boardSize / 2 ? 32 : boardSize - 32,
      y: head.y > boardSize / 2 ? 32 : boardSize - 32,
      color: palette[Math.floor(Math.random() * palette.length)],
      pulse: Math.random() * Math.PI * 2
    };
  }

  function spawnParticles(x, y, color, count = 8) {
    for (let index = 0; index < count; index += 1) {
      const particleAngle = Math.random() * Math.PI * 2;
      const speed = 32 + Math.random() * 62;
      particles.push({
        x,
        y,
        vx: Math.cos(particleAngle) * speed,
        vy: Math.sin(particleAngle) * speed,
        life: 0.5 + Math.random() * 0.28,
        maxLife: 0.78,
        color
      });
    }
  }

  function updateParticles(delta) {
    particles = particles.filter((particle) => {
      particle.x = wrap(particle.x + particle.vx * delta);
      particle.y = wrap(particle.y + particle.vy * delta);
      particle.life -= delta;
      return particle.life > 0;
    });
  }

  function draw() {
    drawBackground();
    drawFoods();
    drawSnakeTrail();
    drawParticles();
  }

  // The board fill and dot pattern never change, so they render once offscreen.
  function getBackgroundCanvas() {
    if (backgroundCanvas) return backgroundCanvas;
    backgroundCanvas = document.createElement("canvas");
    backgroundCanvas.width = boardSize;
    backgroundCanvas.height = boardSize;
    const bg = backgroundCanvas.getContext("2d");
    bg.fillStyle = "#07171f";
    bg.fillRect(0, 0, boardSize, boardSize);
    bg.fillStyle = "rgba(141, 244, 95, 0.08)";
    for (let index = 0; index < 70; index += 1) {
      const x = (index * 71) % boardSize;
      const y = (index * 43) % boardSize;
      bg.fillRect(x, y, 2, 2);
    }
    return backgroundCanvas;
  }

  function drawBackground() {
    context.drawImage(getBackgroundCanvas(), 0, 0);
  }

  function drawFoods() {
    foods.forEach((food) => {
      food.pulse += 0.035;
      const radius = foodRadius + Math.sin(food.pulse) * 1.4;
      drawGlowCircle(food.x, food.y, radius, food.color, 20);
      context.fillStyle = "rgba(255, 255, 255, 0.42)";
      context.beginPath();
      context.arc(food.x - 2.5, food.y - 2.5, 2.2, 0, Math.PI * 2);
      context.fill();
    });
  }

  function drawSnakeTrail() {
    for (let index = snake.length - 1; index >= 0; index -= 1) {
      const part = snake[index];
      const progress = 1 - index / Math.max(1, snake.length);
      const radius = index === 0 ? headRadius : bodyRadius * (0.72 + progress * 0.32);
      const color = index === 0 ? "#2fd7ff" : index < 12 ? "#54f1ff" : "#8df45f";
      drawGlowCircle(part.x, part.y, radius, color, index === 0 ? 20 : 12);
    }

    drawEyes();
  }

  function drawEyes() {
    const eyeOffset = headRadius * 0.45;
    const normal = angle + Math.PI / 2;
    const frontX = head.x + Math.cos(angle) * 4;
    const frontY = head.y + Math.sin(angle) * 4;
    context.fillStyle = "#07242b";
    [-1, 1].forEach((side) => {
      const eyeX = frontX + Math.cos(normal) * eyeOffset * side;
      const eyeY = frontY + Math.sin(normal) * eyeOffset * side;
      context.beginPath();
      context.arc(eyeX, eyeY, 2.2, 0, Math.PI * 2);
      context.fill();
    });
  }

  function drawParticles() {
    particles.forEach((particle) => {
      const alpha = Math.max(0, particle.life / particle.maxLife);
      context.globalAlpha = alpha;
      drawGlowCircle(particle.x, particle.y, 3.2, particle.color, 9);
      context.globalAlpha = 1;
    });
  }

  // Canvas shadowBlur is rasterized in software on many mobile GPUs, so drawing
  // hundreds of glowing circles per frame made phones heat up. Instead each
  // color/halo combination is baked once into a small sprite and blitted.
  function getGlowSprite(color, blurRatio) {
    const key = `${color}|${blurRatio}`;
    let sprite = glowSpriteCache.get(key);
    if (sprite) return sprite;
    const baseBlur = glowSpriteRadius * blurRatio;
    const pad = Math.ceil(glowSpriteRadius + baseBlur);
    sprite = document.createElement("canvas");
    sprite.width = pad * 2;
    sprite.height = pad * 2;
    const spriteContext = sprite.getContext("2d");
    spriteContext.fillStyle = color;
    spriteContext.shadowColor = color;
    spriteContext.shadowBlur = baseBlur;
    spriteContext.beginPath();
    spriteContext.arc(pad, pad, glowSpriteRadius, 0, Math.PI * 2);
    spriteContext.fill();
    glowSpriteCache.set(key, sprite);
    return sprite;
  }

  function drawGlowCircle(x, y, radius, color, blur) {
    const blurRatio = Math.min(4, Math.max(0.5, Math.round((blur / radius) * 2) / 2));
    const sprite = getGlowSprite(color, blurRatio);
    const drawSize = sprite.width * (radius / glowSpriteRadius);
    context.drawImage(sprite, x - drawSize / 2, y - drawSize / 2, drawSize, drawSize);
  }

  function setUiText(element, key, value) {
    if (uiCache[key] === value) return;
    uiCache[key] = value;
    element.textContent = value;
  }

  function updateUi() {
    setUiText(scoreEl, "score", String(score));
    setUiText(bestEl, "best", String(best));
    setUiText(lengthEl, "length", String(Math.max(3, Math.round(targetLength / 42))));
    setUiText(playsEl, "plays", String(plays));
  }

  function readBestScore() {
    return Number(portalStats.readGame(gameId).bestScore) || 0;
  }

  function readPlays() {
    return Number(portalStats.readGame(gameId).plays) || 0;
  }

  function ensurePortalStats() {
    portalStats.ensureGame(gameId, gameTitle);
  }

  function writePortalStats(lastScore, bestScore) {
    return portalStats.recordRun(gameId, gameTitle, lastScore, bestScore);
  }

  function showOverlay(title, message, buttonText) {
    overlayTitle.textContent = title;
    overlayMessage.textContent = message;
    overlay.querySelector("button").textContent = buttonText;
    overlay.hidden = false;
  }

  function hideOverlay() {
    overlay.hidden = true;
  }

  function handleAction(action) {
    if (action === "instructions") {
      openInstruction();
      return;
    }
    if (action === "start" || action === "overlay-start") {
      if (!running) startGame();
      else if (paused) togglePause();
      return;
    }
    if (action === "pause") togglePause();
    if (action === "restart") restartGame();
  }

  function isSpaceKey(key) {
    return key === " " || key === "Space" || key === "Spacebar";
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

  function setTargetFromPoint(clientX, clientY) {
    const rect = boardCanvas.getBoundingClientRect();
    targetPoint = {
      x: clamp((clientX - rect.left) * (boardSize / rect.width), 0, boardSize),
      y: clamp((clientY - rect.top) * (boardSize / rect.height), 0, boardSize)
    };
    if (!running) startGame();
    hasControl = true;
  }

  function setKeyboardAngle(key) {
    if (!(key in keys)) return false;
    if (!running) startGame();
    targetPoint = null;
    targetAngle = keys[key];
    hasControl = true;
    return true;
  }

  function wrap(value) {
    return (value + boardSize) % boardSize;
  }

  function shortestDelta(target, current) {
    let delta = target - current;
    if (Math.abs(delta) > boardSize / 2) {
      delta -= Math.sign(delta) * boardSize;
    }
    return delta;
  }

  function directDistanceBetween(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function normalizeAngle(value) {
    return Math.atan2(Math.sin(value), Math.cos(value));
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  document.addEventListener("keydown", (event) => {
    if (isInstructionOpen()) {
      if (event.key === "Enter" || isSpaceKey(event.key)) {
        event.preventDefault();
        closeInstruction(true);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closeInstruction(false);
      }
      return;
    }

    if (setKeyboardAngle(event.key)) {
      event.preventDefault();
      return;
    }

    if (isSpaceKey(event.key)) {
      event.preventDefault();
      togglePause();
      return;
    }

    if (event.key === "r" || event.key === "R") {
      event.preventDefault();
      restartGame();
    }
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action));
  });

  document.querySelector("[data-instruction-start]")?.addEventListener("click", () => {
    closeInstruction(true);
  });

  document.querySelector("[data-instruction-close]")?.addEventListener("click", () => {
    closeInstruction(false);
  });

  document.querySelectorAll("[data-control]").forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      setKeyboardAngle(button.dataset.control);
    }, { passive: false });
  });

  boardCanvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    touchStart = { pointerId: event.pointerId };
    setTargetFromPoint(event.clientX, event.clientY);
    try {
      boardCanvas.setPointerCapture?.(event.pointerId);
    } catch {
      // Ignore pointer capture failures from interrupted gestures.
    }
  }, { passive: false });

  boardCanvas.addEventListener("pointermove", (event) => {
    if (!touchStart || event.pointerId !== touchStart.pointerId) return;
    event.preventDefault();
    setTargetFromPoint(event.clientX, event.clientY);
  }, { passive: false });

  boardCanvas.addEventListener("pointerup", (event) => {
    if (!touchStart || event.pointerId !== touchStart.pointerId) return;
    event.preventDefault();
    try {
      boardCanvas.releasePointerCapture?.(event.pointerId);
    } catch {
      // Ignore if the pointer was not captured.
    }
    touchStart = null;
  }, { passive: false });

  boardCanvas.addEventListener("pointercancel", () => {
    touchStart = null;
  });

  gameShell?.addEventListener("touchmove", (event) => {
    event.preventDefault();
  }, { passive: false });

  gameShell?.addEventListener("touchend", (event) => {
    const now = Date.now();
    if (now - lastTouchEnd < 360) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });

  ["gesturestart", "gesturechange", "gestureend"].forEach((eventName) => {
    document.addEventListener(eventName, (event) => {
      event.preventDefault();
    }, { passive: false });
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && running && !paused) togglePause();
  });

  window.addEventListener("pagehide", () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
    }
  });

  // The page is locked (no scrolling), so the square board scales itself to
  // whatever space board-wrap has left instead of relying on CSS aspect-ratio
  // alone (which only shrinks height to match width, not the other way).
  function fitBoardCanvas() {
    const wrap = boardCanvas.parentElement;
    if (!wrap) return;
    const style = getComputedStyle(wrap);
    const availableWidth = wrap.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const availableHeight = wrap.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const side = Math.max(140, Math.min(480, availableWidth, availableHeight));
    if (Number.isFinite(side) && side > 0) {
      boardCanvas.style.width = `${Math.floor(side)}px`;
      boardCanvas.style.height = `${Math.floor(side)}px`;
    }
  }

  fitBoardCanvas();
  window.addEventListener("resize", fitBoardCanvas);
  window.addEventListener("orientationchange", fitBoardCanvas);
})();
