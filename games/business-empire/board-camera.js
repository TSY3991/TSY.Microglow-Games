(function () {
  "use strict";

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function createBoardCamera(options = {}) {
    const frame = options.frame;
    const stage = options.stage;
    const board = options.board;
    if (!frame || !stage || !board) return null;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const state = {
      x: 0,
      y: 0,
      scale: 1,
      targetX: 0,
      targetY: 0,
      targetScale: 1,
      suspended: false,
      dragging: false,
      pointers: new Map(),
      pinchDistance: 0,
      pinchScale: 1,
      raf: 0,
      resizeObserver: null
    };

    function dimensions() {
      return {
        frameWidth: frame.clientWidth || 1,
        frameHeight: frame.clientHeight || 1,
        boardWidth: board.offsetWidth || 1,
        boardHeight: board.offsetHeight || 1
      };
    }

    function limits(scale = state.targetScale) {
      const { frameWidth, frameHeight, boardWidth, boardHeight } = dimensions();
      const scaledWidth = boardWidth * scale;
      const scaledHeight = boardHeight * scale;
      const marginX = Math.min(84, frameWidth * 0.22);
      const marginY = Math.min(84, frameHeight * 0.22);
      const centeredX = (frameWidth - scaledWidth) / 2;
      const centeredY = (frameHeight - scaledHeight) / 2;
      return {
        minX: scaledWidth <= frameWidth ? centeredX : frameWidth - scaledWidth - marginX,
        maxX: scaledWidth <= frameWidth ? centeredX : marginX,
        minY: scaledHeight <= frameHeight ? centeredY : frameHeight - scaledHeight - marginY,
        maxY: scaledHeight <= frameHeight ? centeredY : marginY
      };
    }

    function constrainTarget() {
      const bounds = limits();
      state.targetX = clamp(state.targetX, bounds.minX, bounds.maxX);
      state.targetY = clamp(state.targetY, bounds.minY, bounds.maxY);
    }

    function writeTransform() {
      if (frame.scrollLeft || frame.scrollTop) {
        frame.scrollLeft = 0;
        frame.scrollTop = 0;
      }
      stage.style.transform = `translate3d(${state.x.toFixed(2)}px,${state.y.toFixed(2)}px,0) scale(${state.scale.toFixed(4)})`;
      frame.style.setProperty("--camera-scale", state.scale.toFixed(4));
      options.onChange?.({ x: state.x, y: state.y, scale: state.scale, suspended: state.suspended });
    }

    function animate() {
      state.raf = 0;
      const instant = reducedMotion.matches;
      const easing = instant ? 1 : 0.2;
      state.x += (state.targetX - state.x) * easing;
      state.y += (state.targetY - state.y) * easing;
      state.scale += (state.targetScale - state.scale) * easing;
      const settled = Math.abs(state.targetX - state.x) < 0.15
        && Math.abs(state.targetY - state.y) < 0.15
        && Math.abs(state.targetScale - state.scale) < 0.001;
      if (settled) {
        state.x = state.targetX;
        state.y = state.targetY;
        state.scale = state.targetScale;
      }
      writeTransform();
      if (!settled) state.raf = window.requestAnimationFrame(animate);
    }

    function schedule() {
      constrainTarget();
      if (!state.raf) state.raf = window.requestAnimationFrame(animate);
    }

    function scaleBounds() {
      const mobile = window.matchMedia("(max-width: 900px)").matches;
      return mobile ? { min: 0.72, max: 1.7 } : { min: 0.62, max: 1.55 };
    }

    function setScale(nextScale, anchorX, anchorY, suspend = true) {
      const bounds = scaleBounds();
      const previous = state.targetScale;
      const next = clamp(nextScale, bounds.min, bounds.max);
      const rect = frame.getBoundingClientRect();
      const localX = anchorX ?? rect.width / 2;
      const localY = anchorY ?? rect.height / 2;
      const boardX = (localX - state.targetX) / previous;
      const boardY = (localY - state.targetY) / previous;
      state.targetScale = next;
      state.targetX = localX - boardX * next;
      state.targetY = localY - boardY * next;
      if (suspend) suspendFollow();
      schedule();
    }

    function suspendFollow() {
      state.suspended = true;
      frame.classList.add("is-camera-manual");
      options.onFollowChange?.(false);
    }

    function resumeFollow() {
      state.suspended = false;
      frame.classList.remove("is-camera-manual");
      options.onFollowChange?.(true);
    }

    function focusPercent(left, top, config = {}) {
      if (state.suspended && !config.force) return;
      const { frameWidth, frameHeight, boardWidth, boardHeight } = dimensions();
      if (Number.isFinite(config.scale)) state.targetScale = clamp(config.scale, scaleBounds().min, scaleBounds().max);
      state.targetX = frameWidth / 2 - (left / 100) * boardWidth * state.targetScale;
      state.targetY = frameHeight / 2 - (top / 100) * boardHeight * state.targetScale;
      schedule();
    }

    function fit(config = {}) {
      const { frameWidth, frameHeight, boardWidth, boardHeight } = dimensions();
      const mobile = window.matchMedia("(max-width: 900px)").matches;
      const fitScale = Math.min(frameWidth / boardWidth, frameHeight / boardHeight);
      const next = mobile ? Math.max(0.92, fitScale) : Math.max(0.86, Math.min(1, fitScale));
      state.targetScale = clamp(config.scale ?? next, scaleBounds().min, scaleBounds().max);
      state.targetX = (frameWidth - boardWidth * state.targetScale) / 2;
      state.targetY = (frameHeight - boardHeight * state.targetScale) / 2;
      if (config.resume !== false) resumeFollow();
      schedule();
    }

    function onPointerDown(event) {
      if (event.button !== undefined && event.button !== 0) return;
      if (event.target.closest(".board-camera-controls,.board-event-dock,.tile-inspector,button,a,input,select,textarea")) return;
      frame.setPointerCapture?.(event.pointerId);
      state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      state.dragging = true;
      frame.classList.add("is-camera-dragging");
      if (state.pointers.size === 2) {
        const points = [...state.pointers.values()];
        state.pinchDistance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        state.pinchScale = state.targetScale;
      }
    }

    function onPointerMove(event) {
      const previous = state.pointers.get(event.pointerId);
      if (!previous) return;
      const next = { x: event.clientX, y: event.clientY };
      state.pointers.set(event.pointerId, next);
      suspendFollow();
      if (state.pointers.size >= 2) {
        const points = [...state.pointers.values()].slice(0, 2);
        const distance = Math.max(1, Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y));
        const rect = frame.getBoundingClientRect();
        const centerX = (points[0].x + points[1].x) / 2 - rect.left;
        const centerY = (points[0].y + points[1].y) / 2 - rect.top;
        setScale(state.pinchScale * (distance / Math.max(1, state.pinchDistance)), centerX, centerY, false);
      } else {
        state.targetX += next.x - previous.x;
        state.targetY += next.y - previous.y;
        schedule();
      }
      event.preventDefault();
    }

    function onPointerUp(event) {
      state.pointers.delete(event.pointerId);
      if (state.pointers.size < 2) state.pinchDistance = 0;
      if (state.pointers.size === 0) {
        state.dragging = false;
        frame.classList.remove("is-camera-dragging");
      }
    }

    function onWheel(event) {
      if (event.target.closest(".board-event-dock,.tile-inspector")) return;
      const rect = frame.getBoundingClientRect();
      setScale(state.targetScale * (event.deltaY > 0 ? 0.9 : 1.1), event.clientX - rect.left, event.clientY - rect.top);
      event.preventDefault();
    }

    frame.addEventListener("pointerdown", onPointerDown);
    frame.addEventListener("pointermove", onPointerMove, { passive: false });
    frame.addEventListener("pointerup", onPointerUp);
    frame.addEventListener("pointercancel", onPointerUp);
    frame.addEventListener("wheel", onWheel, { passive: false });

    state.resizeObserver = new ResizeObserver(() => {
      stage.style.width = `${board.offsetWidth}px`;
      stage.style.height = `${board.offsetHeight}px`;
      constrainTarget();
      schedule();
    });
    state.resizeObserver.observe(frame);
    state.resizeObserver.observe(board);
    stage.style.width = `${board.offsetWidth}px`;
    stage.style.height = `${board.offsetHeight}px`;
    fit();

    return {
      fit,
      focusPercent,
      resumeFollow,
      suspendFollow,
      setZoomBy(delta) { setScale(state.targetScale + delta); },
      refresh() {
        stage.style.width = `${board.offsetWidth}px`;
        stage.style.height = `${board.offsetHeight}px`;
        schedule();
      },
      isFollowSuspended() { return state.suspended; },
      getScale() { return state.targetScale; },
      destroy() {
        if (state.raf) window.cancelAnimationFrame(state.raf);
        state.resizeObserver?.disconnect();
        frame.removeEventListener("pointerdown", onPointerDown);
        frame.removeEventListener("pointermove", onPointerMove);
        frame.removeEventListener("pointerup", onPointerUp);
        frame.removeEventListener("pointercancel", onPointerUp);
        frame.removeEventListener("wheel", onWheel);
      }
    };
  }

  window.MicroglowBoardCamera = { create: createBoardCamera };
})();
