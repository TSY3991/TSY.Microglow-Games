import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const artifactDir = path.join(repoRoot, "qa-artifacts");
const gemUrl = pathToFileURL(path.join(repoRoot, "games", "gem", "index.html")).href;

const viewports = [
  { name: "390", width: 390, height: 900 },
  { name: "768", width: 768, height: 900 },
  { name: "1280", width: 1280, height: 900 }
];

const consoleEntries = [];
const pageErrors = [];
const failures = [];

function recordConsole(viewport, message) {
  const type = message.type();
  if (type !== "error" && type !== "warning") return;
  consoleEntries.push({
    viewport,
    type,
    text: message.text(),
    location: message.location()
  });
}

function formatLocation(location = {}) {
  const file = location.url || "unknown";
  const line = location.lineNumber ? `:${location.lineNumber}` : "";
  const column = location.columnNumber ? `:${location.columnNumber}` : "";
  return `${file}${line}${column}`;
}

async function assertCanvasNotBlank(page, viewportName) {
  const result = await page.$eval("#gemBoard", (canvas) => {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const { width, height } = canvas;
    const { data } = context.getImageData(0, 0, width, height);
    let paintedPixels = 0;
    let variedPixels = 0;
    const first = [data[0], data[1], data[2], data[3]];

    for (let offset = 0; offset < data.length; offset += 4 * 17) {
      const alpha = data[offset + 3];
      if (alpha > 0) paintedPixels += 1;
      if (
        data[offset] !== first[0] ||
        data[offset + 1] !== first[1] ||
        data[offset + 2] !== first[2] ||
        alpha !== first[3]
      ) {
        variedPixels += 1;
      }
    }

    return { width, height, paintedPixels, variedPixels };
  });

  if (result.paintedPixels === 0 || result.variedPixels < 4) {
    failures.push(
      `${viewportName}: #gemBoard appears blank (${JSON.stringify(result)})`
    );
  }
}

async function assertNoHorizontalOverflow(page, viewportName) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return {
      viewportWidth: window.innerWidth,
      documentClientWidth: doc.clientWidth,
      documentScrollWidth: doc.scrollWidth,
      bodyClientWidth: body.clientWidth,
      bodyScrollWidth: body.scrollWidth
    };
  });

  const maxScrollWidth = Math.max(overflow.documentScrollWidth, overflow.bodyScrollWidth);
  const clientWidth = Math.max(overflow.documentClientWidth, overflow.bodyClientWidth);

  if (maxScrollWidth > clientWidth + 1) {
    failures.push(
      `${viewportName}: horizontal overflow detected (${JSON.stringify(overflow)})`
    );
  }
}

await mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch();
console.log(`Using Playwright bundled Chromium: ${chromium.executablePath()}`);
console.log(`Opening: ${gemUrl}`);

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1
    });
    const page = await context.newPage();

    page.on("console", (message) => recordConsole(viewport.name, message));
    page.on("pageerror", (error) => {
      pageErrors.push(`${viewport.name}: ${error.stack || error.message}`);
    });

    await page.goto(gemUrl, { waitUntil: "load" });
    await page.waitForSelector("#gemBoard", { state: "visible" });
    await page.waitForTimeout(250);

    await assertCanvasNotBlank(page, viewport.name);
    await assertNoHorizontalOverflow(page, viewport.name);

    const outputPath = path.join(artifactDir, `gem-${viewport.name}.png`);
    await page.screenshot({ path: outputPath });
    console.log(`Captured ${viewport.width}x${viewport.height}: ${outputPath}`);

    await context.close();
  }
} finally {
  await browser.close();
}

const consoleErrors = consoleEntries.filter((entry) => entry.type === "error");

if (consoleEntries.length > 0) {
  console.log("\nConsole warnings/errors:");
  for (const entry of consoleEntries) {
    console.log(
      `[${entry.viewport}] ${entry.type.toUpperCase()} ${entry.text} (${formatLocation(entry.location)})`
    );
  }
} else {
  console.log("\nConsole warnings/errors: none");
}

if (pageErrors.length > 0) {
  failures.push(...pageErrors.map((error) => `page error: ${error}`));
}

if (consoleErrors.length > 0) {
  failures.push(`${consoleErrors.length} console error(s) detected`);
}

if (failures.length > 0) {
  console.error("\nQA failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("\nQA passed: screenshots captured, canvas is nonblank, and no horizontal overflow was detected.");
}
