(function () {
  "use strict";

  // Diagnostic error reporting: catch window errors and unhandled promise
  // rejections and forward a bounded sample to Supabase. Installed first so
  // errors thrown while the rest of this file (or its dependencies) are
  // initialising still get captured — buffered locally until the RPC path is
  // ready.
  const ERR_APP = "business-empire";
  const ERR_MAX_PER_SESSION = 20;
  const ERR_DEDUP_WINDOW = 30;
  const errQueue = [];
  const errSeen = new Set();
  let errSent = 0;
  let errFlushTimer = null;

  function errSignature(msg, stack) {
    const s = String(stack || msg || "").slice(0, 200);
    return s;
  }
  function enqueueError(payload) {
    if (errSent >= ERR_MAX_PER_SESSION) return;
    const sig = errSignature(payload.message, payload.stack);
    if (errSeen.has(sig)) return;
    errSeen.add(sig);
    if (errSeen.size > ERR_DEDUP_WINDOW) {
      const first = errSeen.values().next().value;
      errSeen.delete(first);
    }
    errQueue.push(payload);
    errSent += 1;
    scheduleFlush();
  }
  function scheduleFlush() {
    if (errFlushTimer) return;
    errFlushTimer = window.setTimeout(flushErrors, 500);
  }
  async function flushErrors() {
    errFlushTimer = null;
    if (!errQueue.length) return;
    const client = window.MicroglowAuth && window.MicroglowAuth.client;
    if (!client) {
      // Not ready yet; retry later, keep queue bounded.
      if (errQueue.length > ERR_MAX_PER_SESSION) errQueue.length = ERR_MAX_PER_SESSION;
      window.setTimeout(flushErrors, 2000);
      return;
    }
    const batch = errQueue.splice(0, errQueue.length);
    for (const payload of batch) {
      try {
        await client.rpc("report_client_error", {
          p_app: ERR_APP,
          p_message: payload.message,
          p_stack: payload.stack || null,
          p_url: payload.url || null,
          p_user_agent: payload.userAgent || null,
          p_context: payload.context || {}
        });
      } catch (_) {
        // Never let the reporter cascade — silently drop and move on.
      }
    }
  }
  window.addEventListener("error", (event) => {
    try {
      enqueueError({
        message: event.message || (event.error && event.error.message) || "(error event)",
        stack: event.error && event.error.stack,
        url: location.href,
        userAgent: navigator.userAgent,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          gameVer: (window.MicroglowGameVersion || null)
        }
      });
    } catch (_) {}
  });
  window.addEventListener("unhandledrejection", (event) => {
    try {
      const reason = event.reason;
      const message = (reason && (reason.message || String(reason))) || "(unhandled rejection)";
      const stack = reason && reason.stack;
      enqueueError({
        message,
        stack,
        url: location.href,
        userAgent: navigator.userAgent,
        context: { kind: "unhandledrejection", gameVer: (window.MicroglowGameVersion || null) }
      });
    } catch (_) {}
  });
  window.MicroglowDiag = {
    reportClientError(message, extra) {
      enqueueError({
        message: String(message || "(manual)"),
        stack: (extra && extra.stack) || null,
        url: location.href,
        userAgent: navigator.userAgent,
        context: Object.assign(
          { kind: "manual", gameVer: (window.MicroglowGameVersion || null) },
          (extra && extra.context) || {}
        )
      });
    }
  };

  const TURNSTILE_SITE_KEY = "0x4AAAAAAD7mtP2SYLK59ifA";
  const CAPTCHA_TIMEOUT_MS = 15000;
  const RENDER_INITIAL_DELAY_MS = 1000;
  const RENDER_RETRY_MS = 1500;
  const RENDER_MAX_ATTEMPTS = 4;

  const container = document.querySelector("[data-turnstile-widget]");
  let widgetId = null;
  let pendingToken = null;
  let tokenResolvers = [];
  let renderAttempts = 0;

  function resolveToken(token) {
    pendingToken = token;
    tokenResolvers.splice(0).forEach((resolve) => resolve(token));
  }

  function renderTurnstile() {
    if (!container || typeof window.turnstile === "undefined") return;
    if (widgetId !== null) {
      try { window.turnstile.remove(widgetId); } catch (_) {}
      widgetId = null;
    }
    renderAttempts += 1;
    widgetId = window.turnstile.render(container, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: resolveToken,
      "expired-callback": () => { pendingToken = null; },
      "error-callback": () => {
        pendingToken = null;
        if (renderAttempts < RENDER_MAX_ATTEMPTS) {
          window.setTimeout(renderTurnstile, RENDER_RETRY_MS);
        }
      }
    });
  }

  function waitForTurnstile() {
    if (window.turnstile && typeof window.turnstile.render === "function") {
      window.setTimeout(renderTurnstile, RENDER_INITIAL_DELAY_MS);
      return;
    }
    window.setTimeout(waitForTurnstile, 200);
  }

  waitForTurnstile();

  function getCaptchaToken() {
    const wait = pendingToken
      ? Promise.resolve((() => {
          const token = pendingToken;
          pendingToken = null;
          if (widgetId !== null && window.turnstile) window.turnstile.reset(widgetId);
          return token;
        })())
      : new Promise((resolve) => tokenResolvers.push(resolve));

    return Promise.race([
      wait,
      new Promise((_, reject) => window.setTimeout(() => reject(new Error("Turnstile 驗證逾時")), CAPTCHA_TIMEOUT_MS))
    ]);
  }

  if (!window.MicroglowAuth || !window.MicroglowAuth.client) {
    console.error("共用 Supabase client 未載入，帳號功能將 fallback 為本機模式。");
    return;
  }

  const client = window.MicroglowAuth.client;

  async function withCaptcha(run) {
    const captchaToken = await getCaptchaToken();
    const result = await run(captchaToken);
    if (result.error) throw result.error;
    return result;
  }

  window.MicroglowSupabaseAuth = {
    signInAnonymously: () => withCaptcha((captchaToken) =>
      client.auth.signInAnonymously({ options: { captchaToken } })
    ),
    signIn: ({ email, password }) => withCaptcha((captchaToken) =>
      client.auth.signInWithPassword({ email, password, options: { captchaToken } })
    ),
    signUp: ({ email, password }) => withCaptcha((captchaToken) =>
      client.auth.signUp({ email, password, options: { captchaToken } })
    ),
    getSession: () => client.auth.getSession().then((result) => {
      if (result.error) throw result.error;
      return result;
    })
  };

  // ---- Connected multiplayer match data layer ----

  async function getMatch(matchId) {
    const { data, error } = await client.from("matches").select("*").eq("id", matchId).single();
    if (error) throw error;
    return data;
  }

  async function listMatchPlayers(matchId) {
    const { data, error } = await client
      .from("match_players")
      .select("user_id, seat_number, status, result, score")
      .eq("match_id", matchId)
      .order("seat_number", { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function listBusinessEmpirePlayers(matchId) {
    const { data, error } = await client
      .from("business_empire_players")
      .select("*")
      .eq("match_id", matchId);
    if (error) throw error;
    return data || [];
  }

  async function listOwnedAssets(matchId) {
    const { data, error } = await client
      .from("business_empire_owned_assets")
      .select("*")
      .eq("match_id", matchId);
    if (error) throw error;
    return data || [];
  }

  async function listMatchEventsSince(matchId, sinceEventNo) {
    const { data, error } = await client
      .from("match_events")
      .select("*")
      .eq("match_id", matchId)
      .gt("event_no", sinceEventNo || 0)
      .order("event_no", { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function getProfiles(userIds) {
    const ids = [...new Set(userIds)].filter(Boolean);
    if (ids.length === 0) return {};
    const { data, error } = await client
      .from("profiles")
      .select("id, username, display_name")
      .in("id", ids);
    if (error) throw error;
    const byId = {};
    (data || []).forEach((row) => { byId[row.id] = row; });
    return byId;
  }

  async function callBusinessAction(matchId, actionType, requestId, payload) {
    const { data, error } = await client.rpc("business_empire_action", {
      p_match_id: matchId,
      p_action_type: actionType,
      p_request_id: requestId,
      p_payload: payload || {}
    });
    if (error) throw error;
    return data;
  }

  async function forceAdvanceExpiredTurn(matchId) {
    const { data, error } = await client.rpc("force_advance_expired_turn", { p_match_id: matchId });
    if (error) throw error;
    return data;
  }

  function subscribeMatch(matchId, onChange) {
    const channel = client
      .channel(`business-match-${matchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `id=eq.${matchId}` }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "business_empire_players", filter: `match_id=eq.${matchId}` }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "business_empire_owned_assets", filter: `match_id=eq.${matchId}` }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_events", filter: `match_id=eq.${matchId}` }, onChange)
      .subscribe();
    return () => client.removeChannel(channel);
  }

  window.MicroglowMatch = {
    getMatch,
    listMatchPlayers,
    listBusinessEmpirePlayers,
    listOwnedAssets,
    listMatchEventsSince,
    getProfiles,
    callBusinessAction,
    forceAdvanceExpiredTurn,
    subscribeMatch
  };
})();
