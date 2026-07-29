(function () {
  "use strict";

  const TEMPLATE = "      <section class=\"mp-gate\" data-mp-gate hidden>\n        <div class=\"mp-gate-card\">\n          <p class=\"mp-gate-kicker\">SIGN IN REQUIRED</p>\n          <h2>請先登入或以訪客身分開始</h2>\n          <p data-mp-gate-message>點「以訪客身分開始」立即體驗，或直接登入正式會員。</p>\n          <div class=\"mp-gate-actions\">\n            <button type=\"button\" class=\"primary-link\" data-mp-guest-start>以訪客身分開始</button>\n            <a class=\"secondary-link\" data-mp-gate-link href=\"#\">前往登入</a>\n          </div>\n          <p class=\"mp-status\" data-mp-guest-start-feedback></p>\n          <div data-mp-turnstile-widget aria-hidden=\"true\"></div>\n        </div>\n      </section>\n\n      <section class=\"mp-guest-banner\" data-mp-guest-banner hidden>\n        <p><strong>訪客模式</strong>：好友與房間資料存在這個瀏覽器裡，換裝置或清除資料會遺失。想永久保存，可以升級為正式會員（原有資料會自動保留）。</p>\n        <a class=\"primary-link\" data-mp-upgrade-link href=\"#\">升級為正式會員</a>\n      </section>\n\n      <section class=\"mp-app\" data-mp-app hidden>\n        <nav class=\"mp-tabs\" aria-label=\"多人功能分頁\">\n          <button type=\"button\" class=\"is-active\" data-mp-tab=\"friends\" aria-current=\"page\">好友</button>\n          <button type=\"button\" data-mp-tab=\"room\">好友房</button>\n          <button type=\"button\" data-mp-tab=\"queue\">隨機配對</button>\n        </nav>\n\n        <section class=\"mp-panel\" data-mp-panel=\"friends\">\n          <div class=\"mp-card\">\n            <h2>我的玩家代碼</h2>\n            <p class=\"mp-hint\">分享這組代碼給朋友，讓對方用「用代碼加好友」加你——訪客帳號也能用。</p>\n            <div class=\"mp-code-display\">\n              <strong data-mp-my-code>------</strong>\n              <button type=\"button\" class=\"primary-link\" data-mp-action=\"copy-code\">複製</button>\n            </div>\n            <p class=\"mp-status\" data-mp-code-feedback></p>\n          </div>\n\n          <div class=\"mp-card\">\n            <h2>用代碼加好友</h2>\n            <p class=\"mp-hint\">輸入朋友分享給你的 6 碼玩家代碼。</p>\n            <form class=\"mp-search-form\" data-mp-code-invite-form>\n              <input type=\"text\" placeholder=\"玩家代碼\" autocomplete=\"off\" maxlength=\"6\" data-mp-code-invite-input>\n              <button type=\"submit\" class=\"primary-link\">送出邀請</button>\n            </form>\n          </div>\n\n          <div class=\"mp-card\" data-mp-permanent-only>\n            <h2>搜尋玩家</h2>\n            <p class=\"mp-hint\">輸入完整暱稱，或至少 3 個字元的開頭進行搜尋（僅限正式會員）。</p>\n            <form class=\"mp-search-form\" data-mp-search-form>\n              <input type=\"text\" placeholder=\"暱稱（username）\" autocomplete=\"off\" data-mp-search-input>\n              <button type=\"submit\" class=\"primary-link\">搜尋</button>\n            </form>\n            <ul class=\"mp-list\" data-mp-search-results></ul>\n          </div>\n\n          <div class=\"mp-card\">\n            <h2>好友邀請</h2>\n            <ul class=\"mp-list\" data-mp-friend-invites>\n              <li class=\"mp-empty\">目前沒有待處理的好友邀請。</li>\n            </ul>\n          </div>\n\n          <div class=\"mp-card\">\n            <h2>已送出的邀請</h2>\n            <ul class=\"mp-list\" data-mp-sent-friend-invites>\n              <li class=\"mp-empty\">目前沒有已送出、待處理的邀請。</li>\n            </ul>\n          </div>\n\n          <div class=\"mp-card\">\n            <h2>好友名單</h2>\n            <ul class=\"mp-list\" data-mp-friend-list>\n              <li class=\"mp-empty\">還沒有好友，先搜尋暱稱送出邀請吧。</li>\n            </ul>\n          </div>\n        </section>\n\n        <section class=\"mp-panel\" data-mp-panel=\"room\" hidden>\n          <div class=\"mp-card\" data-mp-room-invites-card>\n            <h2>房間邀請</h2>\n            <ul class=\"mp-list\" data-mp-room-invites>\n              <li class=\"mp-empty\">目前沒有待處理的房間邀請。</li>\n            </ul>\n          </div>\n\n          <div class=\"mp-card\" data-mp-no-room-card>\n            <h2>建立或加入好友房</h2>\n            <div class=\"mp-actions\">\n              <button type=\"button\" class=\"primary-link\" data-mp-action=\"create-room\">建立房間</button>\n            </div>\n            <form class=\"mp-search-form\" data-mp-join-form>\n              <input type=\"text\" placeholder=\"房間代碼\" autocomplete=\"off\" maxlength=\"6\" data-mp-room-code-input>\n              <button type=\"submit\" class=\"primary-link\">加入房間</button>\n            </form>\n          </div>\n\n          <div class=\"mp-card\" data-mp-room-card hidden>\n            <h2>目前房間 <span class=\"mp-room-code\" data-mp-room-code></span></h2>\n            <p class=\"mp-hint\" data-mp-room-status></p>\n            <ul class=\"mp-list\" data-mp-room-members></ul>\n            <form class=\"mp-search-form\" data-mp-invite-form>\n              <select data-mp-invite-select>\n                <option value=\"\">選擇要邀請的好友…</option>\n              </select>\n              <button type=\"submit\" class=\"primary-link\">送出邀請</button>\n            </form>\n            <div class=\"mp-actions\">\n              <button type=\"button\" class=\"primary-link\" data-mp-action=\"toggle-ready\">準備／取消準備</button>\n              <button type=\"button\" class=\"primary-link\" data-mp-action=\"start-match\" hidden data-mp-host-only>開始比賽</button>\n              <button type=\"button\" class=\"mp-danger\" data-mp-action=\"leave-room\">離開房間</button>\n            </div>\n            <p class=\"mp-status\" data-mp-room-feedback></p>\n          </div>\n        </section>\n\n        <section class=\"mp-panel\" data-mp-panel=\"queue\" hidden>\n          <div class=\"mp-card\">\n            <h2>隨機配對</h2>\n            <p class=\"mp-hint\">系統每分鐘檢查一次配對，不保證立即配對成功。</p>\n            <div class=\"mp-actions\">\n              <button type=\"button\" class=\"primary-link\" data-mp-action=\"enqueue\">加入配對佇列</button>\n              <button type=\"button\" class=\"mp-danger\" data-mp-action=\"cancel-queue\" hidden>取消配對</button>\n            </div>\n            <p class=\"mp-status\" data-mp-queue-status></p>\n          </div>\n        </section>\n      </section>\n";
  let activeController = null;

  function initMultiplayerUI(container, opts = {}) {
    if (!container) throw new Error("Missing multiplayer mount container");
    if (activeController) activeController.destroy();
    container.innerHTML = TEMPLATE;
    activeController = createController(container, opts);
    activeController.start(opts.initialTab || "friends");
    return activeController;
  }

  function createController(container, opts) {
      const auth = window.MicroglowAuth;
      const mp = window.MicroglowMultiplayer;
    
      const elements = {
        gate: container.querySelector("[data-mp-gate]"),
        gateMessage: container.querySelector("[data-mp-gate-message]"),
        gateLink: container.querySelector("[data-mp-gate-link]"),
        guestStartButton: container.querySelector("[data-mp-guest-start]"),
        guestStartFeedback: container.querySelector("[data-mp-guest-start-feedback]"),
        app: container.querySelector("[data-mp-app]"),
        guestBanner: container.querySelector("[data-mp-guest-banner]"),
        upgradeLink: container.querySelector("[data-mp-upgrade-link]"),
        permanentOnlyCards: [...container.querySelectorAll("[data-mp-permanent-only]")],
        myCode: container.querySelector("[data-mp-my-code]"),
        codeFeedback: container.querySelector("[data-mp-code-feedback]"),
        codeInviteForm: container.querySelector("[data-mp-code-invite-form]"),
        codeInviteInput: container.querySelector("[data-mp-code-invite-input]"),
        tabs: [...container.querySelectorAll("[data-mp-tab]")],
        panels: [...container.querySelectorAll("[data-mp-panel]")],
        searchForm: container.querySelector("[data-mp-search-form]"),
        searchInput: container.querySelector("[data-mp-search-input]"),
        searchResults: container.querySelector("[data-mp-search-results]"),
        friendInvites: container.querySelector("[data-mp-friend-invites]"),
        sentFriendInvites: container.querySelector("[data-mp-sent-friend-invites]"),
        friendList: container.querySelector("[data-mp-friend-list]"),
        roomInvitesCard: container.querySelector("[data-mp-room-invites-card]"),
        roomInvites: container.querySelector("[data-mp-room-invites]"),
        noRoomCard: container.querySelector("[data-mp-no-room-card]"),
        joinForm: container.querySelector("[data-mp-join-form]"),
        roomCodeInput: container.querySelector("[data-mp-room-code-input]"),
        roomCard: container.querySelector("[data-mp-room-card]"),
        roomCode: container.querySelector("[data-mp-room-code]"),
        roomStatus: container.querySelector("[data-mp-room-status]"),
        roomMembers: container.querySelector("[data-mp-room-members]"),
        inviteForm: container.querySelector("[data-mp-invite-form]"),
        inviteSelect: container.querySelector("[data-mp-invite-select]"),
        roomFeedback: container.querySelector("[data-mp-room-feedback]"),
        startMatchButton: container.querySelector('[data-mp-action="start-match"]'),
        queueStatus: container.querySelector("[data-mp-queue-status]"),
        enqueueButton: container.querySelector('[data-mp-action="enqueue"]'),
        cancelQueueButton: container.querySelector('[data-mp-action="cancel-queue"]')
      };
    
      let currentUserId = null;
      let currentRoom = null;
      let roomUnsubscribe = null;
      let queueUnsubscribe = null;
      let invitesUnsubscribe = null;
      let presenceTimerId = null;
    
      const TURNSTILE_SITE_KEY = "0x4AAAAAAD7mtP2SYLK59ifA";
      const CAPTCHA_TIMEOUT_MS = 15000;
      const turnstileContainer = container.querySelector("[data-mp-turnstile-widget]");
      let turnstileWidgetId = null;
      let turnstileToken = null;
      let turnstileResolvers = [];
      let turnstileRenderAttempts = 0;
    
      function resolveTurnstileToken(token) {
        turnstileToken = token;
        turnstileResolvers.splice(0).forEach((resolve) => resolve(token));
      }
    
      function renderTurnstile() {
        if (!turnstileContainer || typeof window.turnstile === "undefined" || turnstileWidgetId !== null) return;
        turnstileRenderAttempts += 1;
        turnstileWidgetId = window.turnstile.render(turnstileContainer, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: resolveTurnstileToken,
          "expired-callback": () => { turnstileToken = null; },
          "error-callback": () => {
            turnstileToken = null;
            turnstileWidgetId = null;
            if (turnstileRenderAttempts < 4) window.setTimeout(renderTurnstile, 1500);
          }
        });
      }
    
      function waitForTurnstile() {
        if (window.turnstile && typeof window.turnstile.render === "function") {
          window.setTimeout(renderTurnstile, 400);
          return;
        }
        window.setTimeout(waitForTurnstile, 200);
      }
    
      function getCaptchaToken() {
        const wait = turnstileToken
          ? Promise.resolve((() => {
              const token = turnstileToken;
              turnstileToken = null;
              if (turnstileWidgetId !== null && window.turnstile) window.turnstile.reset(turnstileWidgetId);
              return token;
            })())
          : new Promise((resolve) => turnstileResolvers.push(resolve));
        return Promise.race([
          wait,
          new Promise((_, reject) => window.setTimeout(() => reject(new Error("安全驗證逾時，請再試一次。")), CAPTCHA_TIMEOUT_MS))
        ]);
      }
    
      function setStatus(el, message, tone) {
        if (!el) return;
        el.textContent = message || "";
        if (tone) el.dataset.tone = tone;
        else delete el.dataset.tone;
      }
    
      function selectTab(name) {
        elements.tabs.forEach((tab) => {
          const active = tab.dataset.mpTab === name;
          tab.classList.toggle("is-active", active);
          tab.setAttribute("aria-current", active ? "page" : "false");
        });
        elements.panels.forEach((panel) => {
          panel.hidden = panel.dataset.mpPanel !== name;
        });
      }
    
      async function init() {
        if (!auth || !mp) {
          showGate("多人功能載入失敗，請重新整理頁面。");
          return;
        }
    
        const { data, error } = await auth.getSession();
        if (error) {
          showGate("無法讀取登入狀態，請重新整理頁面。");
          return;
        }
    
        const user = data?.session?.user;
        if (!user) {
          showGate();
          return;
        }
    
        currentUserId = user.id;
        const isGuest = auth.isAnonymousUser(user);
        elements.gate.hidden = true;
        elements.app.hidden = false;
        elements.guestBanner.hidden = !isGuest;
        if (isGuest) {
          elements.upgradeLink.href = auth.getPortalLoginUrl(window.location.href);
        }
        elements.permanentOnlyCards.forEach((card) => { card.hidden = isGuest; });
    
        bindControls();
        await Promise.all([loadFriends(), loadFriendInvites(), loadMyRoom(), loadQueueStatus(), loadMyCode()]);
        invitesUnsubscribe = mp.subscribeInvites(currentUserId, () => {
          loadFriendInvites();
          loadRoomInvitesIfNoRoom();
        });
      }
    
      async function loadMyCode() {
        try {
          const code = await mp.getMyPlayerCode();
          elements.myCode.textContent = code || "------";
        } catch (error) {
          elements.myCode.textContent = "------";
        }
      }
    
      function showGate(message) {
        if (message) setStatus(elements.gateMessage, message);
        elements.gateLink.href = auth ? auth.getPortalLoginUrl(window.location.href) : elements.gateLink.href;
        elements.gate.hidden = false;
        elements.app.hidden = true;
      }
    
      function bindControls() {
        elements.tabs.forEach((tab) => {
          tab.addEventListener("click", () => selectTab(tab.dataset.mpTab));
        });
    
        container.querySelector('[data-mp-action="copy-code"]').addEventListener("click", async () => {
          const code = elements.myCode.textContent.trim();
          if (!code || code === "------") return;
          try {
            await navigator.clipboard.writeText(code);
            setStatus(elements.codeFeedback, "已複製到剪貼簿。", "success");
          } catch (error) {
            setStatus(elements.codeFeedback, "複製失敗，請手動選取文字複製。", "error");
          }
        });
    
        elements.codeInviteForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const code = elements.codeInviteInput.value.trim();
          if (!code) return;
          try {
            await mp.sendFriendInviteByCode(code);
            elements.codeInviteInput.value = "";
            setStatus(elements.codeFeedback, "邀請已送出。", "success");
          } catch (error) {
            setStatus(elements.codeFeedback, error.message || "送出失敗", "error");
          }
        });
    
        elements.searchForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const query = elements.searchInput.value.trim();
          elements.searchResults.replaceChildren();
          try {
            const results = await mp.searchProfiles(query);
            renderSearchResults(results);
          } catch (error) {
            elements.searchResults.replaceChildren(emptyItem(error.message || "搜尋失敗"));
          }
        });
    
        elements.joinForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const code = elements.roomCodeInput.value.trim();
          if (!code) return;
          try {
            await mp.joinRoomByCode(code);
            elements.roomCodeInput.value = "";
            await loadMyRoom();
          } catch (error) {
            setStatus(elements.roomFeedback, error.message || "加入房間失敗", "error");
          }
        });
    
        container.querySelector('[data-mp-action="create-room"]').addEventListener("click", async (event) => {
          event.target.disabled = true;
          try {
            await mp.createFriendRoom();
            await loadMyRoom();
          } catch (error) {
            setStatus(elements.roomFeedback, error.message || "建立房間失敗", "error");
          } finally {
            event.target.disabled = false;
          }
        });
    
        elements.inviteForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          if (!currentRoom) return;
          const friendId = elements.inviteSelect.value;
          if (!friendId) return;
          try {
            await mp.inviteFriendToRoom(currentRoom.room_id, friendId);
            elements.inviteSelect.value = "";
            setStatus(elements.roomFeedback, "邀請已送出。", "success");
          } catch (error) {
            setStatus(elements.roomFeedback, error.message || "邀請失敗", "error");
          }
        });
    
        container.querySelector('[data-mp-action="toggle-ready"]').addEventListener("click", async () => {
          if (!currentRoom) return;
          try {
            await mp.setRoomReady(currentRoom.room_id, !currentRoom.is_ready);
            await loadMyRoom();
          } catch (error) {
            setStatus(elements.roomFeedback, error.message || "更新準備狀態失敗", "error");
          }
        });
    
        elements.startMatchButton.addEventListener("click", async (event) => {
          if (!currentRoom) return;
          event.target.disabled = true;
          try {
            const match = await mp.startMatch(currentRoom.room_id);
            goToMatch(match.id);
          } catch (error) {
            setStatus(elements.roomFeedback, error.message || "開始比賽失敗", "error");
            event.target.disabled = false;
          }
        });
    
        container.querySelector('[data-mp-action="leave-room"]').addEventListener("click", async () => {
          if (!currentRoom) return;
          try {
            await mp.leaveRoom(currentRoom.room_id);
            currentRoom = null;
            stopPresenceHeartbeat();
            if (roomUnsubscribe) { roomUnsubscribe(); roomUnsubscribe = null; }
            await loadMyRoom();
          } catch (error) {
            setStatus(elements.roomFeedback, error.message || "離開房間失敗", "error");
          }
        });
    
        elements.enqueueButton.addEventListener("click", async () => {
          try {
            await mp.enqueueMatch();
            await loadQueueStatus();
          } catch (error) {
            setStatus(elements.queueStatus, error.message || "加入配對失敗", "error");
          }
        });
    
        elements.cancelQueueButton.addEventListener("click", async () => {
          const entry = await mp.getMyQueueEntry();
          if (!entry) return;
          try {
            await mp.cancelMatchQueue(entry.id);
            await loadQueueStatus();
          } catch (error) {
            setStatus(elements.queueStatus, error.message || "取消配對失敗", "error");
          }
        });
      }
    
      function emptyItem(text) {
        const li = document.createElement("li");
        li.className = "mp-empty";
        li.textContent = text;
        return li;
      }
    
      function renderSearchResults(results) {
        elements.searchResults.replaceChildren();
        if (results.length === 0) {
          elements.searchResults.append(emptyItem("沒有符合的玩家。"));
          return;
        }
        results.forEach((profile) => {
          const li = document.createElement("li");
          li.innerHTML = `<span class="mp-list-name">${escapeHtml(profile.username || profile.display_name)}</span>`;
          const button = document.createElement("button");
          button.type = "button";
          button.className = "mp-accept";
          button.textContent = "送出好友邀請";
          button.addEventListener("click", async () => {
            button.disabled = true;
            try {
              await mp.sendFriendInvite(profile.id);
              button.textContent = "已送出";
            } catch (error) {
              button.disabled = false;
              button.textContent = error.message || "送出失敗";
            }
          });
          li.append(button);
          elements.searchResults.append(li);
        });
      }
    
      async function loadFriendInvites() {
        try {
          const invites = await mp.listFriendInvites();
          const incoming = invites.filter((invite) => invite.receiver_id === currentUserId);
          const outgoing = invites.filter((invite) => invite.sender_id === currentUserId);
          const profiles = await mp.getProfiles([
            ...incoming.map((invite) => invite.sender_id),
            ...outgoing.map((invite) => invite.receiver_id)
          ]);
          elements.friendInvites.replaceChildren();
          if (incoming.length === 0) {
            elements.friendInvites.append(emptyItem("目前沒有待處理的好友邀請。"));
          } else {
            incoming.forEach((invite) => {
              const profile = profiles[invite.sender_id];
              const li = document.createElement("li");
              li.innerHTML = `<span class="mp-list-name">${escapeHtml(profile?.username || profile?.display_name || "未知玩家")}</span>`;
              const actions = document.createElement("div");
              actions.className = "mp-list-actions";
              actions.append(
                buildActionButton("mp-accept", "接受", () => respondFriend(invite.id, true)),
                buildActionButton("mp-decline", "拒絕", () => respondFriend(invite.id, false))
              );
              li.append(actions);
              elements.friendInvites.append(li);
            });
          }
    
          elements.sentFriendInvites.replaceChildren();
          if (outgoing.length === 0) {
            elements.sentFriendInvites.append(emptyItem("目前沒有已送出、待處理的邀請。"));
          } else {
            outgoing.forEach((invite) => {
              const profile = profiles[invite.receiver_id];
              const li = document.createElement("li");
              li.innerHTML = `<span class="mp-list-name">${escapeHtml(profile?.username || profile?.display_name || "未知玩家")}</span>`;
              const actions = document.createElement("div");
              actions.className = "mp-list-actions";
              actions.append(buildActionButton("mp-decline", "取消", () => cancelSentInvite(invite.id)));
              li.append(actions);
              elements.sentFriendInvites.append(li);
            });
          }
        } catch (error) {
          elements.friendInvites.replaceChildren(emptyItem(error.message || "載入邀請失敗"));
        }
      }
    
      async function respondFriend(inviteId, accept) {
        try {
          await mp.respondFriendInvite(inviteId, accept);
          await Promise.all([loadFriendInvites(), loadFriends()]);
        } catch (error) {
          elements.friendInvites.append(emptyItem(error.message || "處理邀請失敗"));
        }
      }
    
      async function cancelSentInvite(inviteId) {
        try {
          await mp.cancelFriendInvite(inviteId);
          await loadFriendInvites();
        } catch (error) {
          elements.sentFriendInvites.append(emptyItem(error.message || "取消邀請失敗"));
        }
      }
    
      function buildActionButton(className, label, handler) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = className;
        button.textContent = label;
        button.addEventListener("click", async () => {
          button.disabled = true;
          await handler();
        });
        return button;
      }
    
      async function loadFriends() {
        try {
          const friends = await mp.listFriends();
          const profiles = await mp.getProfiles(friends.map((friend) => friend.friendId));
          elements.friendList.replaceChildren();
          elements.inviteSelect.replaceChildren(new Option("選擇要邀請的好友…", ""));
          if (friends.length === 0) {
            elements.friendList.append(emptyItem("還沒有好友，可以用玩家代碼或搜尋暱稱送出邀請。"));
            return;
          }
          friends.forEach((friend) => {
            const profile = profiles[friend.friendId];
            const label = profile?.username || profile?.display_name || "未知玩家";
            const li = document.createElement("li");
            li.innerHTML = `<span class="mp-list-name">${escapeHtml(label)}</span>`;
            elements.friendList.append(li);
            elements.inviteSelect.append(new Option(label, friend.friendId));
          });
        } catch (error) {
          elements.friendList.replaceChildren(emptyItem(error.message || "載入好友失敗"));
        }
      }
    
      async function loadRoomInvitesIfNoRoom() {
        if (currentRoom) {
          elements.roomInvitesCard.hidden = true;
          return;
        }
        try {
          const invites = await mp.listRoomInvites();
          const profiles = await mp.getProfiles(invites.map((invite) => invite.sender_id));
          elements.roomInvites.replaceChildren();
          elements.roomInvitesCard.hidden = false;
          if (invites.length === 0) {
            elements.roomInvites.append(emptyItem("目前沒有待處理的房間邀請。"));
            return;
          }
          invites.forEach((invite) => {
            const profile = profiles[invite.sender_id];
            const li = document.createElement("li");
            li.innerHTML = `<span class="mp-list-name">${escapeHtml(profile?.username || profile?.display_name || "未知玩家")} 的房間邀請</span>`;
            const actions = document.createElement("div");
            actions.className = "mp-list-actions";
            actions.append(
              buildActionButton("mp-accept", "加入", async () => {
                try {
                  await mp.respondRoomInvite(invite.id, true);
                  await loadMyRoom();
                } catch (error) {
                  setStatus(elements.roomFeedback, error.message || "加入房間失敗", "error");
                }
              }),
              buildActionButton("mp-decline", "拒絕", async () => {
                try {
                  await mp.respondRoomInvite(invite.id, false);
                  await loadRoomInvitesIfNoRoom();
                } catch (error) {
                  setStatus(elements.roomFeedback, error.message || "處理邀請失敗", "error");
                }
              })
            );
            li.append(actions);
            elements.roomInvites.append(li);
          });
        } catch (error) {
          elements.roomInvites.replaceChildren(emptyItem(error.message || "載入房間邀請失敗"));
        }
      }
    
      function goToMatch(matchId) {
        if (opts && typeof opts.onMatch === "function") {
          opts.onMatch(matchId);
          return;
        }
        const url = new URL(window.location.href);
        url.searchParams.set("match", matchId);
        url.hash = "";
        window.location.href = url.href;
      }
    
      function ensureZombieCard() {
        if (elements.zombieCard) return;
        const panel = container.querySelector('[data-mp-panel="room"]');
        if (!panel) return;
        const card = document.createElement("div");
        card.className = "mp-card";
        card.hidden = true;
        card.setAttribute("data-mp-zombie-card", "");
        card.innerHTML =
          '<h2>已進行中的對戰：<span class="mp-room-code" data-mp-zombie-room-code></span></h2>' +
          '<p class="mp-hint">你在這間房有一場已開始、還沒結束的對戰。可以重新加入繼續玩，或放棄之後另外開新的房。</p>' +
          '<div class="mp-actions">' +
          '<button type="button" class="primary-link" data-mp-action="rejoin-match">重新加入對戰</button>' +
          '<button type="button" class="mp-danger" data-mp-action="abandon-match">放棄此對戰</button>' +
          '</div>' +
          '<p class="mp-status" data-mp-zombie-feedback></p>';
        panel.appendChild(card);
        elements.zombieCard = card;
        elements.zombieRoomCode = card.querySelector("[data-mp-zombie-room-code]");
        elements.zombieFeedback = card.querySelector("[data-mp-zombie-feedback]");
        card.querySelector('[data-mp-action="rejoin-match"]').addEventListener("click", () => {
          const matchId = currentRoom?.game_rooms?.current_match_id;
          if (matchId) goToMatch(matchId);
        });
        card.querySelector('[data-mp-action="abandon-match"]').addEventListener("click", async () => {
          const roomId = currentRoom?.room_id;
          if (!roomId) return;
          try {
            setStatus(elements.zombieFeedback, "放棄中…");
            await mp.abandonRoomMembership(roomId);
            currentRoom = null;
            await loadMyRoom();
          } catch (error) {
            setStatus(elements.zombieFeedback, error.message || "放棄失敗", "error");
          }
        });
      }

      async function loadMyRoom() {
        ensureZombieCard();
        try {
          const membership = await mp.getMyRoom();
          if (!membership) {
            currentRoom = null;
            stopPresenceHeartbeat();
            if (roomUnsubscribe) { roomUnsubscribe(); roomUnsubscribe = null; }
            elements.roomCard.hidden = true;
            elements.noRoomCard.hidden = false;
            if (elements.zombieCard) elements.zombieCard.hidden = true;
            await loadRoomInvitesIfNoRoom();
            return;
          }

          const matchedRoom = membership.game_rooms;
          // Do NOT auto-navigate on stale in-progress rooms. A disconnected
          // membership hijacks every subsequent lobby visit if we redirect on
          // read; show the player a rejoin/abandon choice instead.
          if (matchedRoom?.status === "in_progress" && matchedRoom?.current_match_id) {
            currentRoom = membership;
            stopPresenceHeartbeat();
            if (roomUnsubscribe) { roomUnsubscribe(); roomUnsubscribe = null; }
            elements.roomCard.hidden = true;
            elements.noRoomCard.hidden = true;
            elements.roomInvitesCard.hidden = true;
            elements.zombieCard.hidden = false;
            elements.zombieRoomCode.textContent = matchedRoom.room_code || "";
            setStatus(elements.zombieFeedback, "");
            return;
          }

          currentRoom = membership;
          elements.noRoomCard.hidden = true;
          elements.roomInvitesCard.hidden = true;
          elements.roomCard.hidden = false;
          if (elements.zombieCard) elements.zombieCard.hidden = true;
          const room = membership.game_rooms;
          elements.roomCode.textContent = room?.room_code || "";
          const isHost = room && room.host_user_id === currentUserId;
          elements.startMatchButton.hidden = !isHost;
          setStatus(elements.roomStatus, `房間狀態：${room?.status || "lobby"}${isHost ? "（你是房主）" : ""}`);
    
          await renderRoomMembers(membership.room_id, isHost);
          startPresenceHeartbeat(membership.room_id);
          if (!roomUnsubscribe) {
            roomUnsubscribe = mp.subscribeRoom(membership.room_id, () => loadMyRoom());
          }
        } catch (error) {
          setStatus(elements.roomFeedback, error.message || "載入房間失敗", "error");
        }
      }
    
      async function renderRoomMembers(roomId, isHost) {
        try {
          const members = await mp.listRoomMembers(roomId);
          const profiles = await mp.getProfiles(members.map((member) => member.user_id));
          elements.roomMembers.replaceChildren();
          members.forEach((member) => {
            const profile = profiles[member.user_id];
            const isSelf = member.user_id === currentUserId;
            const label = isSelf ? "你" : (profile?.username || profile?.display_name || "未知玩家");
            const li = document.createElement("li");
            li.innerHTML = `<span class="mp-list-name">${escapeHtml(label)}</span><span>${member.is_ready ? "已準備" : member.status}</span>`;
            if (isHost && !isSelf) {
              const actions = document.createElement("div");
              actions.className = "mp-list-actions";
              actions.append(buildActionButton("mp-danger", "踢出", () => kickRoomMember(roomId, member.user_id)));
              li.append(actions);
            }
            elements.roomMembers.append(li);
          });
        } catch (error) {
          elements.roomMembers.replaceChildren(emptyItem(error.message || "載入成員失敗"));
        }
      }
    
      async function kickRoomMember(roomId, targetUserId) {
        try {
          await mp.removeRoomMember(roomId, targetUserId);
          await renderRoomMembers(roomId, true);
        } catch (error) {
          setStatus(elements.roomFeedback, error.message || "踢出成員失敗", "error");
        }
      }
    
      function startPresenceHeartbeat(roomId) {
        stopPresenceHeartbeat();
        presenceTimerId = window.setInterval(() => {
          mp.touchPresence(roomId).catch(() => {});
        }, 25000);
      }
    
      function stopPresenceHeartbeat() {
        if (presenceTimerId !== null) {
          window.clearInterval(presenceTimerId);
          presenceTimerId = null;
        }
      }
    
      async function loadQueueStatus() {
        try {
          const entry = await mp.getMyQueueEntry();
          if (!entry) {
            setStatus(elements.queueStatus, "尚未加入配對佇列。");
            elements.enqueueButton.hidden = false;
            elements.cancelQueueButton.hidden = true;
            if (queueUnsubscribe) { queueUnsubscribe(); queueUnsubscribe = null; }
            return;
          }
          setStatus(elements.queueStatus, "配對中，系統每分鐘檢查一次，請耐心等候。");
          elements.enqueueButton.hidden = true;
          elements.cancelQueueButton.hidden = false;
          if (!queueUnsubscribe) {
            queueUnsubscribe = mp.subscribeQueue(currentUserId, async () => {
              loadQueueStatus();
              await loadMyRoom();
              if (currentRoom) selectTab("room");
            });
          }
        } catch (error) {
          setStatus(elements.queueStatus, error.message || "載入配對狀態失敗", "error");
        }
      }
    
      function escapeHtml(value) {
        const div = document.createElement("div");
        div.textContent = value == null ? "" : String(value);
        return div.innerHTML;
      }
    
      function bindGateControls() {
        if (!elements.guestStartButton) return;
        elements.guestStartButton.addEventListener("click", async () => {
          if (!auth || !auth.signInAnonymously) {
            setStatus(elements.guestStartFeedback, "訪客登入功能載入失敗，請重新整理頁面。", "error");
            return;
          }
          elements.guestStartButton.disabled = true;
          setStatus(elements.guestStartFeedback, "正在建立訪客身分…");
          try {
            const captchaToken = await getCaptchaToken();
            const result = await auth.signInAnonymously({ captchaToken });
            if (result.error) throw result.error;
            setStatus(elements.guestStartFeedback, "");
            await init();
          } catch (error) {
            setStatus(elements.guestStartFeedback, error.message || "訪客登入失敗，請再試一次。", "error");
          } finally {
            elements.guestStartButton.disabled = false;
          }
        });
      }

    function destroy() {
      stopPresenceHeartbeat();
      if (roomUnsubscribe) { roomUnsubscribe(); roomUnsubscribe = null; }
      if (queueUnsubscribe) { queueUnsubscribe(); queueUnsubscribe = null; }
      if (invitesUnsubscribe) { invitesUnsubscribe(); invitesUnsubscribe = null; }
      turnstileResolvers.splice(0).forEach((resolve) => resolve(null));
      if (turnstileWidgetId !== null && window.turnstile && typeof window.turnstile.remove === "function") {
        try { window.turnstile.remove(turnstileWidgetId); } catch (_) {}
      }
    }

    async function start(initialTab) {
      selectTab(initialTab || "friends");
      waitForTurnstile();
      bindGateControls();
      await init();
      selectTab(initialTab || "friends");
    }

    return { start, destroy, selectTab };
  }

  window.MicroglowBusinessMultiplayer = { initMultiplayerUI };
})();
