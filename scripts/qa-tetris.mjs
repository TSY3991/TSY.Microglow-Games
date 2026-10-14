import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const options = Object.fromEntries(process.argv.slice(2).map(arg => arg.replace(/^--/, "").split(/=(.*)/s).slice(0, 2)));
const output = options.output ? path.resolve(options.output) : await fs.mkdtemp(path.join(os.tmpdir(), "microglow-tetris-"));
await fs.mkdir(output, { recursive: true });
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".ttf": "font/ttf", ".webmanifest": "application/manifest+json" };
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const filename = path.resolve(repo, "." + pathname, pathname.endsWith("/") ? "index.html" : "");
    if (!filename.startsWith(repo + path.sep)) throw new Error("Outside root");
    const data = await fs.readFile(filename);
    response.writeHead(200, { "Content-Type": mime[path.extname(filename)] || "application/octet-stream", "Cache-Control": "no-store" });
    response.end(data);
  } catch {
    response.writeHead(404);
    response.end();
  }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const url = options.url || `http://127.0.0.1:${server.address().port}/games/tetris/`;
const browser = await chromium.launch({ headless: true, ...(options.browser ? { channel: options.browser } : {}) });
const results = [];
const errors = [];
const storageKey = "tsyMicroglowPortal.gameStats.v1";
const seed = { note: "retain-root-data", games: { "another-game": { title: "Another", bestScore: 42, plays: 7 }, "microglow-tetris": { title: "微光俄羅斯方塊", bestScore: 500, lastScore: 1, plays: 2, updatedAt: "2026-01-01T00:00:00.000Z" } } };

async function open(viewport, randomMode = "cycle", storageMode = "normal") {
  const context = await browser.newContext({ viewport, hasTouch: viewport.width <= 700, deviceScaleFactor: 1 });
  await context.addInitScript(({ randomMode, storageMode, storageKey, seed }) => {
    let index = 0;
    const sequence = [0, .15, .30, .44, .58, .72, .86];
    Math.random = () => randomMode === "I" ? 0 : sequence[index++ % sequence.length];
    if (storageMode === "blocked") {
      Storage.prototype.getItem = () => { throw new Error("Storage blocked"); };
      Storage.prototype.setItem = () => { throw new Error("Storage blocked"); };
    } else {
      localStorage.setItem(storageKey, storageMode === "malformed" ? "{broken" : JSON.stringify(seed));
    }
  }, { randomMode, storageMode, storageKey, seed });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("response", response => { if (response.status() >= 400) errors.push(`${response.status()} ${new URL(response.url()).pathname}`); });
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  return { context, page };
}

async function cells(page) {
  return page.locator("#gameBoard").evaluate(canvas => {
    const context = canvas.getContext("2d");
    const filled = [];
    for (let y = 0; y < 20; y++) for (let x = 0; x < 10; x++) {
      const [r, g, b] = context.getImageData(x * 30 + 15, y * 30 + 15, 1, 1).data;
      if (Math.max(r, g, b) - Math.min(r, g, b) > 40) filled.push({ x, y });
    }
    return filled;
  });
}

async function key(page, value) { await page.keyboard.press(value); }
async function start(page) {
  await page.locator("[data-instruction-start]").click();
  assert(await page.locator("[data-overlay]").isHidden(), "Game did not start");
}

try {
  for (const [width, height] of [[1280, 800], [390, 844], [390, 650], [320, 568]]) {
    const { context, page } = await open({ width, height });
    assert(await page.locator("[data-instruction-modal]").isVisible());
    await page.screenshot({ path: path.join(output, `instructions-${width}x${height}.png`), fullPage: true });
    await start(page);
    await key(page, "ArrowDown");
    await page.screenshot({ path: path.join(output, `playing-${width}x${height}.png`), fullPage: true });
    const layout = await page.evaluate(() => {
      const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
      const visible = element => { const r = element.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !element.closest("[hidden]"); };
      const overlap = (a, b) => Math.min(a.right, b.right) - Math.max(a.x, b.x) > .5 && Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > .5;
      const targets = [...document.querySelectorAll(".top-actions button, .return-nav a, .touch-controls button")].filter(visible).map(rect);
      const out = [...document.querySelectorAll("h1, .top-actions button, .return-nav a, .score-grid > div, .next-slot, .touch-controls button, #gameBoard")].filter(visible).filter(el => { const r = rect(el); return r.x < -.5 || r.y < -.5 || r.right > innerWidth + .5 || r.bottom > innerHeight + .5; }).map(el => el.outerHTML.slice(0, 100));
      const clipped = [...document.querySelectorAll("h1, .top-actions button, .touch-controls button, .score-grid span, .score-grid strong")].filter(visible).filter(el => {
        if (!el.matches(".score-grid span, .score-grid strong")) return el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
        const range = document.createRange();
        range.selectNodeContents(el);
        const text = range.getBoundingClientRect();
        const card = rect(el.parentElement);
        return text.left < card.x || text.right > card.right || text.top < card.y || text.bottom > card.bottom;
      }).map(el => el.textContent);
      const board = rect(document.querySelector("#gameBoard"));
      const controls = rect(document.querySelector(".touch-controls"));
      const scoreCenters = [...document.querySelectorAll(".score-grid > div")].map(card => {
        const c = rect(card);
        return [...card.children].map(child => { const r = rect(child); return Math.abs(r.x + r.width / 2 - c.x - c.width / 2); });
      }).flat();
      return { viewport: [innerWidth, innerHeight], scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight], board, controls, out, clipped, scoreCenters, undersized: innerWidth <= 700 ? targets.filter(r => r.width < 44 || r.height < 44) : [], overlapping: targets.flatMap((r, i) => targets.slice(i + 1).filter(s => overlap(r, s))).length, assets: [...document.images].every(img => img.complete && img.naturalWidth > 0), palette: getComputedStyle(document.body).backgroundColor, previewCount: document.querySelectorAll("[data-preview-canvas]").length, unlocked: document.querySelectorAll(".next-slot:not(.is-locked)").length, boardControlGap: innerWidth <= 700 ? controls.y - rect(document.querySelector(".board-wrap")).bottom - 7 : null, titleHitsNav: overlap(rect(document.querySelector("h1")), rect(document.querySelector(".return-nav"))), buttonStyles: [...document.querySelectorAll(".top-actions button, .touch-controls button")].filter(visible).map(el => { const style = getComputedStyle(el); return { centered: style.alignItems === "center" && style.justifyContent === "center", fontSize: style.fontSize, gap: style.gap }; }) };
    });
    assert.deepEqual(layout.out, []);
    assert.deepEqual(layout.clipped, []);
    assert.deepEqual(layout.undersized, []);
    assert.equal(layout.overlapping, 0);
    assert.equal(layout.titleHitsNav, false);
    assert(layout.assets && layout.scoreCenters.every(error => error < 1));
    assert(layout.buttonStyles.every(button => button.centered));
    assert.equal(layout.palette, "rgb(251, 247, 238)");
    assert.deepEqual(layout.scroll, [width, height]);
    assert(Math.abs(layout.board.height / layout.board.width - 2) < .01);
    assert.equal(layout.previewCount, 5);
    assert.equal(layout.unlocked, 1);
    if (width <= 700) assert(layout.boardControlGap >= 8);
    const html = await page.content();
    assert(!/draft-stats|scene=showcase|視覺草稿|data-scene/.test(html));
    results.push({ test: "layout", ...layout });
    await context.close();
  }

  {
    const { context, page } = await open({ width: 1280, height: 800 });
    await page.keyboard.press("Tab");
    assert.equal(await page.locator(":focus").innerText(), "跳到主要內容");
    await key(page, "Enter");
    assert.equal(await page.locator(":focus").getAttribute("id"), "main-content");
    await start(page);
    const initial = await cells(page);
    assert.equal(initial.length, 4);
    await key(page, "ArrowRight");
    const moved = await cells(page);
    assert.equal(Math.min(...moved.map(c => c.x)), Math.min(...initial.map(c => c.x)) + 1);
    await key(page, "ArrowLeft");
    await key(page, "ArrowUp");
    const rotated = await cells(page);
    assert.notDeepEqual(rotated, initial);
    await key(page, "ArrowDown");
    assert(Number(await page.locator("[data-score]").innerText()) >= 1);
    await key(page, "p");
    assert.equal(await page.locator("[data-overlay-title]").innerText(), "已暫停");
    const paused = await cells(page);
    await key(page, "ArrowRight");
    assert.deepEqual(await cells(page), paused);
    await page.locator("[data-action=pause]").click();
    assert(await page.locator("[data-overlay]").isHidden());
    await key(page, "c");
    assert(await page.locator("[data-action=swap]").isDisabled());
    const preview = await page.locator("[data-preview-canvas]").first().evaluate(c => c.toDataURL());
    await key(page, "Space");
    assert(Number(await page.locator("[data-score]").innerText()) > 1);
    assert.notEqual(await page.locator("[data-preview-canvas]").first().evaluate(c => c.toDataURL()), preview);
    assert(await page.locator("[data-action=swap]").isEnabled());
    await page.locator("[data-action=restart]").click();
    assert.equal(await page.locator("[data-score]").innerText(), "0");
    assert.equal(await page.locator("[data-lines]").innerText(), "0");
    assert.equal(await page.locator("[data-best]").innerText(), "500");
    const gameOver = await page.evaluate(() => {
      for (let i = 0; i < 30; i++) {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
        if (!document.querySelector("[data-overlay]").hidden && document.querySelector("[data-overlay-title]").textContent === "遊戲結束") return true;
      }
      return false;
    });
    assert(gameOver);
    const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
    assert.equal(stored.note, seed.note);
    assert.deepEqual(stored.games["another-game"], seed.games["another-game"]);
    assert.equal(stored.games["microglow-tetris"].plays, 3);
    assert.equal(stored.games["microglow-tetris"].lastScore, Number(await page.locator("[data-score]").innerText()));
    assert(stored.games["microglow-tetris"].bestScore >= 500);
    assert(Number.isFinite(Date.parse(stored.games["microglow-tetris"].updatedAt)));
    results.push({ test: "keyboard-controls-and-storage", passed: true, storedTetris: stored.games["microglow-tetris"] });
    await context.close();
  }

  {
    const { context, page } = await open({ width: 390, height: 844 }, "I");
    await start(page);
    const milestones = await page.evaluate(() => {
      const press = key => document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
      const milestones = [];
      for (let cycle = 0; cycle < 50; cycle++) {
        for (let column = 0; column < 10; column++) {
          press("ArrowUp");
          for (let left = 0; left < 10; left++) press("ArrowLeft");
          for (let right = 0; right < column; right++) press("ArrowRight");
          press(" ");
        }
        if ([12, 24, 37, 49].includes(cycle)) milestones.push({ lines: Number(document.querySelector("[data-lines]").textContent), level: Number(document.querySelector("[data-level]").textContent), unlocked: document.querySelectorAll(".next-slot:not(.is-locked)").length });
      }
      return milestones;
    });
    assert.deepEqual(milestones, [{ lines: 52, level: 6, unlocked: 2 }, { lines: 100, level: 11, unlocked: 3 }, { lines: 152, level: 16, unlocked: 4 }, { lines: 200, level: 21, unlocked: 5 }]);
    results.push({ test: "line-clearing-and-preview-unlocks", milestones });
    await page.screenshot({ path: path.join(output, "level21-five-previews.png"), fullPage: true });
    await context.close();
  }

  {
    const { context, page } = await open({ width: 390, height: 844 });
    await start(page);
    const before = await cells(page);
    const left = await page.locator("[data-control=left]").boundingBox();
    await page.mouse.click(left.x + left.width / 2, left.y + left.height / 2);
    assert.notDeepEqual(await cells(page), before);
    const rotate = await page.locator("[data-control=rotate]").boundingBox();
    const unrotated = await cells(page);
    await page.mouse.click(rotate.x + rotate.width / 2, rotate.y + rotate.height / 2);
    assert.notDeepEqual(await cells(page), unrotated);
    const down = await page.locator("[data-control=down]").boundingBox();
    const scoreBefore = Number(await page.locator("[data-score]").innerText());
    await page.mouse.move(down.x + down.width / 2, down.y + down.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(260);
    await page.mouse.up();
    assert(Number(await page.locator("[data-score]").innerText()) >= scoreBefore + 2);
    const board = await page.locator("#gameBoard").boundingBox();
    const dragBefore = await cells(page);
    await page.mouse.move(board.x + board.width / 2, board.y + 80);
    await page.mouse.down();
    await page.mouse.move(board.x + board.width / 2 + 50, board.y + 80, { steps: 3 });
    await page.mouse.up();
    assert.notDeepEqual(await cells(page), dragBefore);
    await page.touchscreen.tap(board.x + board.width / 2, board.y + 90);
    const tapBefore = await cells(page);
    await page.touchscreen.tap(board.x + board.width / 2, board.y + 90);
    assert.notDeepEqual(await cells(page), tapBefore);
    assert.equal(await page.evaluate(() => visualViewport.scale), 1);
    const swipeScore = Number(await page.locator("[data-score]").innerText());
    await page.mouse.move(board.x + board.width / 2, board.y + 90);
    await page.mouse.down();
    await page.mouse.move(board.x + board.width / 2, board.y + 165, { steps: 3 });
    await page.mouse.up();
    assert(Number(await page.locator("[data-score]").innerText()) > swipeScore);
    const drop = await page.locator("[data-control=drop]").boundingBox();
    await page.mouse.click(drop.x + drop.width / 2, drop.y + drop.height / 2);
    assert(Number(await page.locator("[data-score]").innerText()) > scoreBefore + 2);
    await page.locator("[data-action=gesture]").click();
    assert.equal(await page.evaluate(() => localStorage.getItem("tetris.gesturesEnabled.v1")), "false");
    await page.locator("[data-action=gesture]").click();
    assert.equal(await page.evaluate(() => localStorage.getItem("tetris.gesturesEnabled.v1")), "true");
    results.push({ test: "emulated-pointer-touch-and-repeat", passed: true, realDevice: false });
    await context.close();
  }

  for (const mode of ["blocked", "malformed"]) {
    const { context, page } = await open({ width: 390, height: 844 }, "cycle", mode);
    await start(page);
    await key(page, "Space");
    assert(Number(await page.locator("[data-score]").innerText()) > 0);
    results.push({ test: `storage-${mode}`, passed: true });
    await context.close();
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(output, "results.json"), JSON.stringify({ results, errors, limitations: "Automated Chrome only. No real iOS Safari or Android device testing." }, null, 2) + "\n");
  console.log(JSON.stringify({ passed: results.length, errors, output }));
} catch (error) {
  await fs.writeFile(path.join(output, "failure.json"), JSON.stringify({ error: error.stack, results, errors }, null, 2) + "\n");
  throw error;
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  if (!options.output) await fs.rm(output, { recursive: true, force: true });
}
