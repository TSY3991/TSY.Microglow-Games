// Shared portal game-stats store. Every game previously carried its own copy
// of the read/ensure/write localStorage plumbing; this centralizes it so the
// storage format only lives in one place.
(function () {
  const storageKey = "tsyMicroglowPortal.gameStats.v1";

  function readAll() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function readGame(gameId) {
    const stats = readAll();
    const games = stats.games && typeof stats.games === "object" ? stats.games : {};
    const existing = games[gameId] && typeof games[gameId] === "object" ? games[gameId] : {};
    return existing;
  }

  // Applies `updater(existing)` to the game's entry and persists the result.
  // If the updater returns null/undefined, nothing is written (used by ensure
  // flows that only backfill missing records). Returns the stored entry.
  function updateGame(gameId, updater) {
    const stats = readAll();
    const games = stats.games && typeof stats.games === "object" ? { ...stats.games } : {};
    const existing = games[gameId] && typeof games[gameId] === "object" ? games[gameId] : {};
    const next = updater(existing);
    if (!next) return existing;
    games[gameId] = next;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ ...stats, games }));
    } catch {
      // Ignore private-mode storage failures.
    }
    return next;
  }

  // Backfills a well-formed record without touching existing data.
  // `extraDefaults` lets games add fields such as bestStage/bestStars.
  function ensureGame(gameId, title, extraDefaults = {}) {
    return updateGame(gameId, (existing) => {
      const requiredKeys = ["bestScore", "lastScore", "plays", ...Object.keys(extraDefaults)];
      const complete = existing.title === title && requiredKeys.every((key) => key in existing);
      if (complete) return null;
      const entry = {
        title,
        bestScore: Number(existing.bestScore) || 0,
        lastScore: Number(existing.lastScore) || 0,
        plays: Number(existing.plays) || 0,
        updatedAt: existing.updatedAt || new Date().toISOString()
      };
      for (const [key, fallback] of Object.entries(extraDefaults)) {
        entry[key] = Number(existing[key]) || fallback;
      }
      return entry;
    });
  }

  // Records a finished run: bumps plays, keeps the best score, stores the last
  // score, and merges any extra max-tracked fields (e.g. bestStage/bestStars).
  function recordRun(gameId, title, lastScore, bestScore, extraMax = {}) {
    return updateGame(gameId, (existing) => {
      const entry = {
        ...existing,
        title,
        bestScore: Math.max(Number(existing.bestScore) || 0, bestScore),
        lastScore,
        plays: (Number(existing.plays) || 0) + 1,
        updatedAt: new Date().toISOString()
      };
      for (const [key, value] of Object.entries(extraMax)) {
        entry[key] = Math.max(Number(existing[key]) || 0, value || 0);
      }
      return entry;
    });
  }

  window.MicroglowGameStats = { key: storageKey, readGame, updateGame, ensureGame, recordRun };
})();
