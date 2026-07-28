(function () {
  "use strict";

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
