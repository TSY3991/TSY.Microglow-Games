(function () {
  "use strict";

  const STORAGE_KEY = "microglow-business-account-v1";
  const modal = document.querySelector("[data-account-modal]");
  const introModal = document.querySelector("[data-intro-modal]");
  const accountButton = document.querySelector('[data-action="account"]');
  const guestButton = document.querySelector('[data-action="guest-trial"]');
  const closeButton = document.querySelector("[data-account-close]");
  const form = document.querySelector("[data-auth-form]");
  const emailInput = document.querySelector("[data-auth-email]");
  const passwordInput = document.querySelector("[data-auth-password]");
  const submitButton = document.querySelector("[data-auth-submit]");
  const status = document.querySelector("[data-auth-status]");
  const guestNote = document.querySelector("[data-guest-note]");
  const tabs = Array.from(document.querySelectorAll("[data-auth-tab]"));
  const adapter = window.MicroglowSupabaseAuth || window.MicroglowAuth || null;
  let authMode = "login";
  let activeAccount = null;

  function readLocalAccount() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return value && value.type === "guest" ? value : null;
    } catch (_) {
      return null;
    }
  }

  function writeLocalAccount(account) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
    } catch (_) {
      // Private browsing may block storage; the current session can still continue.
    }
  }

  function normalizeSession(result) {
    return result?.data?.session || result?.session || result || null;
  }

  function isAnonymousUser(user) {
    return Boolean(user?.is_anonymous || user?.app_metadata?.provider === "anonymous" || user?.user_metadata?.is_anonymous);
  }

  function setBusy(busy) {
    if (guestButton) guestButton.disabled = busy;
    if (submitButton) submitButton.disabled = busy;
    form?.setAttribute("aria-busy", String(busy));
  }

  function setStatus(message, tone) {
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone || "info";
  }

  function applyAccount(account) {
    activeAccount = account;
    document.body.dataset.accountType = account.type;
    document.body.dataset.accountCloud = account.cloud ? "true" : "false";

    if (accountButton) {
      accountButton.textContent = account.type === "member" ? (account.label || "會員帳號") : (account.cloud ? "匿名訪客" : "本機訪客");
      accountButton.classList.toggle("is-member", account.type === "member");
    }

    if (closeButton) closeButton.hidden = false;
    if (modal) modal.hidden = true;
    if (introModal) introModal.hidden = false;

    window.dispatchEvent(new CustomEvent("microglow:account-ready", {
      detail: {
        ...account,
        capabilities: account.type === "member"
          ? ["solo", "friends", "matchmaking", "rooms", "leaderboard"]
          : ["solo", "local-progress"]
      }
    }));
  }

  function createLocalGuest() {
    const existing = readLocalAccount();
    if (existing) return existing;
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const account = {
      type: "guest",
      id: "local-" + Date.now().toString(36) + "-" + suffix,
      label: "訪客 " + suffix,
      cloud: false,
      createdAt: new Date().toISOString()
    };
    writeLocalAccount(account);
    return account;
  }

  async function startGuestTrial() {
    setBusy(true);
    if (guestNote) guestNote.textContent = "正在建立訪客對局…";

    try {
      const guestSignIn = adapter?.signInAnonymously || adapter?.signInAsGuest;
      if (guestSignIn) {
        const session = normalizeSession(await guestSignIn.call(adapter));
        if (session?.user) {
          applyAccount({ type: "guest", id: session.user.id, label: "匿名訪客", cloud: true });
          return;
        }
      }

      const account = createLocalGuest();
      if (guestNote) guestNote.textContent = "目前使用本機訪客；進度只保存在這台裝置。";
      applyAccount(account);
    } catch (error) {
      const account = createLocalGuest();
      if (guestNote) guestNote.textContent = "匿名雲端暫時無法連線，已切換成本機訪客。";
      setStatus(error?.message || "雲端連線失敗，已安全切換本機試玩。", "warning");
      applyAccount(account);
    } finally {
      setBusy(false);
    }
  }

  function selectTab(mode) {
    authMode = mode;
    tabs.forEach((tab) => {
      const selected = tab.dataset.authTab === mode;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", String(selected));
    });
    if (submitButton) submitButton.textContent = mode === "login" ? "登入並繼續" : "建立會員帳號";
    if (passwordInput) passwordInput.autocomplete = mode === "login" ? "current-password" : "new-password";
    setStatus(adapter ? "帳號資料會透過 Supabase Auth 安全處理。" : "會員登入介面已完成，等待共用 Supabase client 接線。", adapter ? "info" : "warning");
  }

  async function handleMemberSubmit(event) {
    event.preventDefault();
    const email = emailInput?.value.trim() || "";
    const password = passwordInput?.value || "";

    if (!emailInput?.checkValidity() || password.length < 8) {
      setStatus("請輸入有效 Email，密碼至少 8 個字元。", "error");
      return;
    }
    if (!adapter) {
      setStatus("目前尚未載入 Supabase 前端連線，請先使用訪客試玩。", "warning");
      return;
    }

    const method = authMode === "login" ? adapter.signIn : adapter.signUp;
    if (typeof method !== "function") {
      setStatus("此登入方式尚未完成後端接線，請先使用訪客試玩。", "warning");
      return;
    }

    setBusy(true);
    setStatus(authMode === "login" ? "正在登入…" : "正在建立帳號…", "info");
    try {
      const session = normalizeSession(await method.call(adapter, { email, password }));
      if (!session?.user) {
        setStatus("註冊資料已送出，請依信箱驗證提示完成啟用。", "success");
        return;
      }
      applyAccount({
        type: isAnonymousUser(session.user) ? "guest" : "member",
        id: session.user.id,
        label: session.user.email || "正式會員",
        cloud: true
      });
    } catch (error) {
      setStatus(error?.message || "登入失敗，請稍後再試。", "error");
    } finally {
      setBusy(false);
    }
  }

  async function restoreAccount() {
    if (adapter?.getSession) {
      try {
        const session = normalizeSession(await adapter.getSession());
        if (session?.user) {
          const guest = isAnonymousUser(session.user);
          applyAccount({
            type: guest ? "guest" : "member",
            id: session.user.id,
            label: session.user.email || (guest ? "匿名訪客" : "正式會員"),
            cloud: true
          });
          return;
        }
      } catch (_) {
        // Keep the access screen visible when session restore fails.
      }
    }

    const localGuest = readLocalAccount();
    if (localGuest) {
      applyAccount(localGuest);
      return;
    }

    if (modal) modal.hidden = false;
    if (introModal) introModal.hidden = true;
    if (closeButton) closeButton.hidden = true;
    selectTab("login");
  }

  tabs.forEach((tab) => tab.addEventListener("click", () => selectTab(tab.dataset.authTab)));
  guestButton?.addEventListener("click", startGuestTrial);
  form?.addEventListener("submit", handleMemberSubmit);
  closeButton?.addEventListener("click", () => {
    if (activeAccount && modal) modal.hidden = true;
  });
  accountButton?.addEventListener("click", () => {
    if (!modal) return;
    modal.hidden = false;
    if (closeButton) closeButton.hidden = !activeAccount;
    setStatus(activeAccount?.type === "guest" ? "目前是訪客模式；登入會員後才會開放線上功能。" : "可檢視或切換帳號。", "info");
  });

  restoreAccount();
})();
