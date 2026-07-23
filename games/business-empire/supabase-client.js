(function () {
  "use strict";

  const PROJECT_URL = "https://xduwufkfmzovlwcyodcp.supabase.co";
  const PUBLISHABLE_KEY = "sb_publishable_jlQ4vurF0dI_tlkCMyDKeg_MskXpSC_";
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

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("Supabase JS 未載入，帳號功能將 fallback 為本機模式。");
    return;
  }

  const client = window.supabase.createClient(PROJECT_URL, PUBLISHABLE_KEY);

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
})();
