(function () {
  "use strict";

  const GAME_KEY = "microglow-business-empire";
  const MAP_KEY = "double-ring-city";

  function client() {
    const auth = window.MicroglowAuth;
    if (!auth || !auth.client) {
      throw new Error("MicroglowAuth 尚未載入");
    }
    return auth.client;
  }

  async function requireAnyUserId() {
    const { data, error } = await client().auth.getSession();
    if (error) throw error;
    const user = data?.session?.user;
    if (!user) throw new Error("需要登入");
    return user.id;
  }

  async function requirePermanentUserId() {
    const { data, error } = await client().auth.getSession();
    if (error) throw error;
    const user = data?.session?.user;
    if (!user || window.MicroglowAuth.isAnonymousUser(user)) {
      throw new Error("需要正式會員登入");
    }
    return user.id;
  }

  function newRequestId() {
    return crypto.randomUUID();
  }

  async function callRpc(name, args) {
    const { data, error } = await client().rpc(name, args);
    if (error) throw error;
    return data;
  }

  // ---- Friends ----

  async function searchProfiles(query) {
    const trimmed = (query || "").trim();
    if (trimmed.length === 0) return [];
    const userId = await requirePermanentUserId();
    let request = client()
      .from("profiles")
      .select("id, username, display_name")
      .eq("is_public", true)
      .neq("id", userId)
      .limit(20);
    request = trimmed.length < 3
      ? request.eq("username", trimmed)
      : request.ilike("username", `${trimmed}%`);
    const { data, error } = await request;
    if (error) throw error;
    return data || [];
  }

  async function listFriends() {
    const userId = await requireAnyUserId();
    const { data, error } = await client()
      .from("friendships")
      .select("id, user_a, user_b, created_at")
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.id,
      friendId: row.user_a === userId ? row.user_b : row.user_a,
      createdAt: row.created_at
    }));
  }

  async function listFriendInvites() {
    const userId = await requireAnyUserId();
    const { data, error } = await client()
      .from("friend_invites")
      .select("id, sender_id, receiver_id, status, created_at, expires_at")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function getProfiles(userIds) {
    const ids = [...new Set(userIds)].filter(Boolean);
    if (ids.length === 0) return {};
    const { data, error } = await client()
      .from("profiles")
      .select("id, username, display_name")
      .in("id", ids);
    if (error) throw error;
    const byId = {};
    (data || []).forEach((row) => { byId[row.id] = row; });
    return byId;
  }

  async function sendFriendInvite(receiverId) {
    return callRpc("send_friend_invite", {
      p_receiver_id: receiverId,
      p_request_id: newRequestId()
    });
  }

  async function respondFriendInvite(inviteId, accept) {
    return callRpc("respond_friend_invite", {
      p_invite_id: inviteId,
      p_accept: accept
    });
  }

  async function sendFriendInviteByCode(playerCode) {
    return callRpc("send_friend_invite_by_code", {
      p_player_code: (playerCode || "").trim(),
      p_request_id: newRequestId()
    });
  }

  async function getMyPlayerCode() {
    const userId = await requireAnyUserId();
    const { data, error } = await client()
      .from("profiles")
      .select("player_code")
      .eq("id", userId)
      .single();
    if (error) throw error;
    return data?.player_code || null;
  }

  // ---- Friend rooms ----

  async function createFriendRoom() {
    return callRpc("create_game_room", {
      p_game_key: GAME_KEY,
      p_map_key: MAP_KEY,
      p_visibility: "private",
      p_max_players: 4,
      p_request_id: newRequestId()
    });
  }

  async function joinRoomByCode(code) {
    return callRpc("join_game_room", { p_room_code: code });
  }

  async function setRoomReady(roomId, ready, loadout) {
    return callRpc("set_room_ready", {
      p_room_id: roomId,
      p_ready: ready,
      p_loadout: loadout || {}
    });
  }

  async function inviteFriendToRoom(roomId, receiverId) {
    return callRpc("invite_friend_to_room", {
      p_room_id: roomId,
      p_receiver_id: receiverId,
      p_request_id: newRequestId()
    });
  }

  async function respondRoomInvite(inviteId, accept) {
    return callRpc("respond_room_invite", {
      p_invite_id: inviteId,
      p_accept: accept,
      p_request_id: newRequestId()
    });
  }

  async function leaveRoom(roomId) {
    return callRpc("leave_game_room", {
      p_room_id: roomId,
      p_request_id: newRequestId()
    });
  }

  async function abandonRoomMembership(roomId) {
    return callRpc("abandon_room_membership", {
      p_room_id: roomId,
      p_request_id: newRequestId()
    });
  }

  async function removeRoomMember(roomId, targetUserId) {
    return callRpc("remove_room_member", {
      p_room_id: roomId,
      p_target_user_id: targetUserId,
      p_request_id: newRequestId()
    });
  }

  async function cancelFriendInvite(inviteId) {
    return callRpc("cancel_friend_invite", { p_invite_id: inviteId });
  }

  async function startMatch(roomId) {
    return callRpc("start_game_match", {
      p_room_id: roomId,
      p_request_id: newRequestId()
    });
  }

  async function touchPresence(roomId) {
    return callRpc("touch_room_presence", { p_room_id: roomId });
  }

  async function getMyRoom() {
    const userId = await requireAnyUserId();
    const { data, error } = await client()
      .from("room_members")
      .select("room_id, status, is_ready, seat_number, game_rooms(id, room_code, status, host_user_id, max_players, current_match_id)")
      .eq("user_id", userId)
      .in("status", ["joined", "ready", "disconnected"])
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function listRoomMembers(roomId) {
    const { data, error } = await client()
      .from("room_members")
      .select("user_id, status, is_ready, seat_number")
      .eq("room_id", roomId)
      .in("status", ["joined", "ready", "disconnected"])
      .order("seat_number", { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function listRoomInvites() {
    const userId = await requireAnyUserId();
    const { data, error } = await client()
      .from("room_invites")
      .select("id, room_id, sender_id, receiver_id, status, created_at, expires_at")
      .eq("receiver_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  // ---- Matchmaking ----

  async function enqueueMatch() {
    return callRpc("enqueue_match", {
      p_game_key: GAME_KEY,
      p_map_key: MAP_KEY,
      p_request_id: newRequestId()
    });
  }

  async function cancelMatchQueue(queueId) {
    return callRpc("cancel_match_queue", {
      p_queue_id: queueId,
      p_request_id: newRequestId()
    });
  }

  async function getMyQueueEntry() {
    const userId = await requireAnyUserId();
    const { data, error } = await client()
      .from("match_queue")
      .select("id, status, queued_at, expires_at, matched_room_id")
      .eq("user_id", userId)
      .eq("status", "waiting")
      .order("queued_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  // ---- Realtime ----

  function subscribeRoom(roomId, onChange) {
    const channel = client()
      .channel(`multiplayer-room-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_rooms", filter: `id=eq.${roomId}` }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_members", filter: `room_id=eq.${roomId}` }, onChange)
      .subscribe();
    return () => client().removeChannel(channel);
  }

  function subscribeQueue(userId, onChange) {
    const channel = client()
      .channel(`multiplayer-queue-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_queue", filter: `user_id=eq.${userId}` }, onChange)
      .subscribe();
    return () => client().removeChannel(channel);
  }

  function subscribeInvites(userId, onChange) {
    const channel = client()
      .channel(`multiplayer-invites-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friend_invites", filter: `receiver_id=eq.${userId}` }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "friend_invites", filter: `sender_id=eq.${userId}` }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_invites", filter: `receiver_id=eq.${userId}` }, onChange)
      .subscribe();
    return () => client().removeChannel(channel);
  }

  window.MicroglowMultiplayer = {
    GAME_KEY,
    MAP_KEY,
    requireAnyUserId,
    requirePermanentUserId,
    searchProfiles,
    listFriends,
    listFriendInvites,
    getProfiles,
    sendFriendInvite,
    sendFriendInviteByCode,
    getMyPlayerCode,
    respondFriendInvite,
    createFriendRoom,
    joinRoomByCode,
    setRoomReady,
    inviteFriendToRoom,
    respondRoomInvite,
    leaveRoom,
    abandonRoomMembership,
    removeRoomMember,
    cancelFriendInvite,
    startMatch,
    touchPresence,
    getMyRoom,
    listRoomMembers,
    listRoomInvites,
    enqueueMatch,
    cancelMatchQueue,
    getMyQueueEntry,
    subscribeRoom,
    subscribeQueue,
    subscribeInvites
  };
})();
