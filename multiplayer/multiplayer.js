(function () {
  "use strict";

  const auth = window.MicroglowAuth;
  const mp = window.MicroglowMultiplayer;

  const elements = {
    gate: document.querySelector("[data-mp-gate]"),
    gateMessage: document.querySelector("[data-mp-gate-message]"),
    gateLink: document.querySelector("[data-mp-gate-link]"),
    app: document.querySelector("[data-mp-app]"),
    guestBanner: document.querySelector("[data-mp-guest-banner]"),
    upgradeLink: document.querySelector("[data-mp-upgrade-link]"),
    permanentOnlyCards: [...document.querySelectorAll("[data-mp-permanent-only]")],
    myCode: document.querySelector("[data-mp-my-code]"),
    codeFeedback: document.querySelector("[data-mp-code-feedback]"),
    codeInviteForm: document.querySelector("[data-mp-code-invite-form]"),
    codeInviteInput: document.querySelector("[data-mp-code-invite-input]"),
    tabs: [...document.querySelectorAll("[data-mp-tab]")],
    panels: [...document.querySelectorAll("[data-mp-panel]")],
    searchForm: document.querySelector("[data-mp-search-form]"),
    searchInput: document.querySelector("[data-mp-search-input]"),
    searchResults: document.querySelector("[data-mp-search-results]"),
    friendInvites: document.querySelector("[data-mp-friend-invites]"),
    friendList: document.querySelector("[data-mp-friend-list]"),
    roomInvitesCard: document.querySelector("[data-mp-room-invites-card]"),
    roomInvites: document.querySelector("[data-mp-room-invites]"),
    noRoomCard: document.querySelector("[data-mp-no-room-card]"),
    joinForm: document.querySelector("[data-mp-join-form]"),
    roomCodeInput: document.querySelector("[data-mp-room-code-input]"),
    roomCard: document.querySelector("[data-mp-room-card]"),
    roomCode: document.querySelector("[data-mp-room-code]"),
    roomStatus: document.querySelector("[data-mp-room-status]"),
    roomMembers: document.querySelector("[data-mp-room-members]"),
    inviteForm: document.querySelector("[data-mp-invite-form]"),
    inviteSelect: document.querySelector("[data-mp-invite-select]"),
    roomFeedback: document.querySelector("[data-mp-room-feedback]"),
    startMatchButton: document.querySelector('[data-mp-action="start-match"]'),
    queueStatus: document.querySelector("[data-mp-queue-status]"),
    enqueueButton: document.querySelector('[data-mp-action="enqueue"]'),
    cancelQueueButton: document.querySelector('[data-mp-action="cancel-queue"]'),
    matchResult: document.querySelector("[data-mp-match-result]"),
    matchId: document.querySelector("[data-mp-match-id]")
  };

  let currentUserId = null;
  let currentRoom = null;
  let roomUnsubscribe = null;
  let queueUnsubscribe = null;
  let invitesUnsubscribe = null;
  let presenceTimerId = null;

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

    document.querySelector('[data-mp-action="copy-code"]').addEventListener("click", async () => {
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

    document.querySelector('[data-mp-action="create-room"]').addEventListener("click", async (event) => {
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

    document.querySelector('[data-mp-action="toggle-ready"]').addEventListener("click", async () => {
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
        showMatchResult(match);
      } catch (error) {
        setStatus(elements.roomFeedback, error.message || "開始比賽失敗", "error");
      } finally {
        event.target.disabled = false;
      }
    });

    document.querySelector('[data-mp-action="leave-room"]').addEventListener("click", async () => {
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
      const profiles = await mp.getProfiles(incoming.map((invite) => invite.sender_id));
      elements.friendInvites.replaceChildren();
      if (incoming.length === 0) {
        elements.friendInvites.append(emptyItem("目前沒有待處理的好友邀請。"));
        return;
      }
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

  async function loadMyRoom() {
    try {
      const membership = await mp.getMyRoom();
      if (!membership) {
        currentRoom = null;
        stopPresenceHeartbeat();
        if (roomUnsubscribe) { roomUnsubscribe(); roomUnsubscribe = null; }
        elements.roomCard.hidden = true;
        elements.noRoomCard.hidden = false;
        await loadRoomInvitesIfNoRoom();
        return;
      }

      currentRoom = membership;
      elements.noRoomCard.hidden = true;
      elements.roomInvitesCard.hidden = true;
      elements.roomCard.hidden = false;
      const room = membership.game_rooms;
      elements.roomCode.textContent = room?.room_code || "";
      const isHost = room && room.host_user_id === currentUserId;
      elements.startMatchButton.hidden = !isHost;
      setStatus(elements.roomStatus, `房間狀態：${room?.status || "lobby"}${isHost ? "（你是房主）" : ""}`);

      await renderRoomMembers(membership.room_id);
      startPresenceHeartbeat(membership.room_id);
      if (!roomUnsubscribe) {
        roomUnsubscribe = mp.subscribeRoom(membership.room_id, () => loadMyRoom());
      }
    } catch (error) {
      setStatus(elements.roomFeedback, error.message || "載入房間失敗", "error");
    }
  }

  async function renderRoomMembers(roomId) {
    try {
      const members = await mp.listRoomMembers(roomId);
      const profiles = await mp.getProfiles(members.map((member) => member.user_id));
      elements.roomMembers.replaceChildren();
      members.forEach((member) => {
        const profile = profiles[member.user_id];
        const li = document.createElement("li");
        const label = member.user_id === currentUserId ? "你" : (profile?.username || profile?.display_name || "未知玩家");
        li.innerHTML = `<span class="mp-list-name">${escapeHtml(label)}</span><span>${member.is_ready ? "已準備" : member.status}</span>`;
        elements.roomMembers.append(li);
      });
    } catch (error) {
      elements.roomMembers.replaceChildren(emptyItem(error.message || "載入成員失敗"));
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
        queueUnsubscribe = mp.subscribeQueue(currentUserId, () => loadQueueStatus());
      }
    } catch (error) {
      setStatus(elements.queueStatus, error.message || "載入配對狀態失敗", "error");
    }
  }

  function showMatchResult(match) {
    elements.matchId.textContent = `Match ID：${match.id}`;
    elements.matchResult.hidden = false;
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value == null ? "" : String(value);
    return div.innerHTML;
  }

  init();
})();
