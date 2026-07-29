(function () {
  "use strict";

  const STORAGE_KEY = "microglow-business-account-v1";
  const DEFAULT_NICKNAMES = new Set(["微光旅人", "匿名訪客", "雲端訪客", "正式會員", "會員帳號", "冒險者"]);
  const modal = document.querySelector("[data-account-modal]");
  const nicknameModal = document.querySelector("[data-nickname-modal]");
  const nicknameForm = document.querySelector("[data-nickname-form]");
  const nicknameInput = document.querySelector("[data-nickname-input]");
  const nicknameSubmit = document.querySelector("[data-nickname-submit]");
  const nicknameStatus = document.querySelector("[data-nickname-status]");
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
  const portalAdapter = window.MicroglowAuth || null;
  const adapter = window.MicroglowSupabaseAuth || portalAdapter || null;
  let authMode = "login";
  let activeAccount = null;
  let pendingResume = false;
  let pendingNicknameAccount = null;

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

  function normalizeNickname(value) {
    const nickname = String(value || "").trim().replace(/\s+/g, " ");
    if (!nickname || DEFAULT_NICKNAMES.has(nickname)) return "";
    if (/^訪客\s+[A-Z0-9]{4}$/i.test(nickname) || nickname.includes("@")) return "";
    return nickname;
  }

  function setBusy(busy) {
    if (guestButton) guestButton.disabled = busy;
    if (submitButton) submitButton.disabled = busy;
    form?.setAttribute("aria-busy", String(busy));
  }

  function setNicknameBusy(busy) {
    if (nicknameSubmit) nicknameSubmit.disabled = busy;
    if (nicknameInput) nicknameInput.disabled = busy;
    nicknameForm?.setAttribute("aria-busy", String(busy));
  }

  function setStatus(message, tone) {
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone || "info";
  }

  function setNicknameStatus(message, tone) {
    if (!nicknameStatus) return;
    nicknameStatus.textContent = message;
    nicknameStatus.dataset.tone = tone || "info";
  }

  function setResumeControl(enabled) {
    if (!closeButton) return;
    closeButton.classList.toggle("is-resume", enabled);
    closeButton.textContent = enabled ? "繼續 →" : "×";
    closeButton.setAttribute("aria-label", enabled ? "使用目前帳號繼續" : "關閉帳號選單");
  }

  function prepareAccountShell(account) {
    activeAccount = account;
    document.body.dataset.accountType = account.type;
    document.body.dataset.accountCloud = account.cloud ? "true" : "false";
    if (accountButton) {
      accountButton.textContent = normalizeNickname(account.nickname || account.label) || (account.type === "member" ? "會員帳號" : "訪客帳號");
      accountButton.classList.toggle("is-member", account.type === "member");
    }
  }

  async function resolveAccountNickname(account) {
    const cached = normalizeNickname(account.nickname || (account.cloud ? "" : account.label));
    if (!account.cloud || !account.id) return cached;

    const client = portalAdapter?.client;
    if (!client) return cached;
    const { data, error } = await client
      .from("profiles")
      .select("username, display_name")
      .eq("id", account.id)
      .maybeSingle();
    if (error) throw error;
    return normalizeNickname(data?.username) || normalizeNickname(data?.display_name) || cached;
  }

  function showNicknameSetup(account, message) {
    pendingNicknameAccount = account;
    prepareAccountShell(account);
    if (modal) modal.hidden = true;
    if (introModal) introModal.hidden = true;
    if (nicknameModal) nicknameModal.hidden = false;
    if (nicknameInput) nicknameInput.value = "";
    setNicknameStatus(message || "第一次進入前，請先設定一個玩家暱稱。", "info");
    window.requestAnimationFrame(() => nicknameInput?.focus());
  }

  function dispatchAccountReady(account, connected) {
    const capabilities = account.type === "member"
      ? ["solo", "friends", "matchmaking", "rooms", "leaderboard"]
      : account.cloud
        ? ["solo", "friends", "matchmaking", "rooms"]
        : ["solo", "local-progress"];
    const detail = { ...account, connected, capabilities };
    window.MicroglowBusinessAccount = detail;
    window.dispatchEvent(new CustomEvent("microglow:account-ready", { detail }));
  }

  function finalizeAccount(account) {
    const connected = Boolean(new URLSearchParams(window.location.search).get("match"));
    pendingResume = false;
    pendingNicknameAccount = null;
    prepareAccountShell(account);
    if (closeButton) closeButton.hidden = false;
    setResumeControl(false);
    if (modal) modal.hidden = true;
    if (nicknameModal) nicknameModal.hidden = true;
    if (introModal) introModal.hidden = connected;
    dispatchAccountReady(account, connected);
  }

  async function applyAccount(account) {
    const connected = Boolean(new URLSearchParams(window.location.search).get("match"));
    prepareAccountShell(account);
    let nickname = "";
    let lookupFailed = false;
    try {
      nickname = await resolveAccountNickname(account);
    } catch (_) {
      lookupFailed = true;
    }

    if (!nickname && !connected) {
      showNicknameSetup(account, lookupFailed
        ? "暫時無法讀取既有暱稱，請輸入暱稱後繼續。"
        : "第一次進入前，請先設定一個玩家暱稱。");
      return;
    }

    finalizeAccount({
      ...account,
      nickname: nickname || account.nickname || "",
      label: nickname || account.label
    });
  }

  async function saveNickname(account, nickname) {
    if (account.cloud) {
      const client = portalAdapter?.client;
      if (!client) throw new Error("雲端帳號服務尚未載入，請重新整理後再試。");
      const { error } = await client.from("profiles").update({ display_name: nickname }).eq("id", account.id);
      if (error) throw error;
      return { ...account, nickname, label: nickname };
    }

    const updated = { ...account, nickname, label: nickname };
    writeLocalAccount(updated);
    return updated;
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
    if (guestNote) guestNote.textContent = "正在建立安全的訪客身分…";

    try {
      const guestSignIn = adapter?.signInAnonymously || adapter?.signInAsGuest;
      if (guestSignIn) {
        const session = normalizeSession(await guestSignIn.call(adapter));
        if (session?.user) {
          await applyAccount({ type: "guest", id: session.user.id, label: "雲端訪客", cloud: true });
          return;
        }
      }

      const account = createLocalGuest();
      if (guestNote) guestNote.textContent = "目前使用本機訪客，遊玩紀錄會保存在這台裝置。";
      await applyAccount(account);
    } catch (error) {
      const account = createLocalGuest();
      if (guestNote) guestNote.textContent = "雲端訪客暫時無法使用，已切換成本機試玩。";
      setStatus(error?.message || "雲端服務忙碌，已改用本機訪客試玩。", "warning");
      await applyAccount(account);
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
    setStatus(adapter ? "帳號資料會透過 Supabase Auth 安全處理。" : "會員登入尚未連接後端，仍可使用訪客模式。", adapter ? "info" : "warning");
  }

  async function handleMemberSubmit(event) {
    event.preventDefault();
    const email = emailInput?.value.trim() || "";
    const password = passwordInput?.value || "";

    if (!emailInput?.checkValidity() || password.length < 8) {
      setStatus("請輸入有效的 Email，密碼至少 8 個字元。", "error");
      return;
    }
    if (!adapter) {
      setStatus("目前尚未載入 Supabase 登入服務，請重新整理或使用訪客模式。", "warning");
      return;
    }

    const method = authMode === "login" ? adapter.signIn : adapter.signUp;
    if (typeof method !== "function") {
      setStatus("目前登入方法不可用，請改用訪客模式。", "warning");
      return;
    }

    setBusy(true);
    setStatus(authMode === "login" ? "正在登入…" : "正在建立帳號…", "info");
    try {
      const session = normalizeSession(await method.call(adapter, { email, password }));
      if (!session?.user) {
        setStatus("註冊資料已送出，請依 Email 驗證信完成確認。", "success");
        return;
      }
      await applyAccount({
        type: isAnonymousUser(session.user) ? "guest" : "member",
        id: session.user.id,
        label: session.user.email || "會員帳號",
        cloud: true
      });
    } catch (error) {
      setStatus(error?.message || "登入失敗，請確認資料後重試。", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleNicknameSubmit(event) {
    event.preventDefault();
    if (!pendingNicknameAccount) return;
    const nickname = String(nicknameInput?.value || "").trim().replace(/\s+/g, " ");
    if (nickname.length < 2 || nickname.length > 24 || /[\u0000-\u001F\u007F]/.test(nickname)) {
      setNicknameStatus("暱稱需為 2 至 24 個可見字元。", "error");
      nicknameInput?.focus();
      return;
    }

    setNicknameBusy(true);
    setNicknameStatus("正在儲存暱稱…", "info");
    try {
      const updated = await saveNickname(pendingNicknameAccount, nickname);
      setNicknameStatus("暱稱已儲存，正在進入遊戲…", "success");
      finalizeAccount(updated);
    } catch (error) {
      setNicknameStatus(error?.message || "暱稱儲存失敗，請再試一次。", "error");
    } finally {
      setNicknameBusy(false);
    }
  }

  async function restoreAccount() {
    if (adapter?.getSession) {
      try {
        const session = normalizeSession(await adapter.getSession());
        if (session?.user) {
          const guest = isAnonymousUser(session.user);
          await applyAccount({
            type: guest ? "guest" : "member",
            id: session.user.id,
            label: session.user.email || (guest ? "雲端訪客" : "會員帳號"),
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
      await applyAccount(localGuest);
      return;
    }

    if (modal) modal.hidden = false;
    if (nicknameModal) nicknameModal.hidden = true;
    if (introModal) introModal.hidden = true;
    if (closeButton) closeButton.hidden = true;
    selectTab("login");
  }

  tabs.forEach((tab) => tab.addEventListener("click", () => selectTab(tab.dataset.authTab)));
  guestButton?.addEventListener("click", startGuestTrial);
  form?.addEventListener("submit", handleMemberSubmit);
  nicknameForm?.addEventListener("submit", handleNicknameSubmit);
  closeButton?.addEventListener("click", () => {
    if (!activeAccount || !modal) return;
    modal.hidden = true;
    if (pendingResume && introModal) introModal.hidden = false;
    pendingResume = false;
    setResumeControl(false);
  });
  accountButton?.addEventListener("click", () => {
    if (!modal) return;
    pendingResume = false;
    setResumeControl(false);
    modal.hidden = false;
    if (nicknameModal) nicknameModal.hidden = true;
    if (closeButton) closeButton.hidden = !activeAccount;
    setStatus(activeAccount?.type === "guest" ? "你目前使用訪客帳號，也可以登入會員永久保存資料。" : "你目前已使用會員帳號。", "info");
  });

  restoreAccount();
})();
