const groups = new Map();

const normalizeMemberId = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const normalizeGroupCode = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
};

const generateGroupCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

const ensureGroup = (code) => {
  if (!groups.has(code)) {
    groups.set(code, {
      ownerId: null,
      members: {},
      locations: {},
      messages: [],
    });
  }
  return groups.get(code);
};

const serializeMembers = (group) => {
  return Object.values(group.members)
    .map((member) => ({
      memberId: member.memberId,
      userName: member.userName,
      role: member.role,
      muted: member.muted,
      online: member.online,
      lastSeen: member.lastSeen,
      lat: typeof member.lastLat === 'number' ? member.lastLat : null,
      lng: typeof member.lastLng === 'number' ? member.lastLng : null,
    }))
    .sort((a, b) => {
      if (a.role === 'owner' && b.role !== 'owner') return -1;
      if (b.role === 'owner' && a.role !== 'owner') return 1;
      if (a.online && !b.online) return -1;
      if (b.online && !a.online) return 1;
      return a.userName.localeCompare(b.userName, 'zh-CN');
    });
};

const buildChatMessage = (userName, text) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  userName: typeof userName === 'string' && userName.trim() !== '' ? userName.trim() : '匿名游民',
  text: typeof text === 'string' ? text.trim() : '',
  createdAt: new Date().toISOString(),
});

const getPagedGroupHistory = (group, offset = 0, limit = 30) => {
  const total = Array.isArray(group?.messages) ? group.messages.length : 0;
  const safeOffset = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
  const safeLimit = Number.isFinite(limit) ? Math.min(100, Math.max(1, Math.floor(limit))) : 30;
  const end = Math.max(0, total - safeOffset);
  const start = Math.max(0, end - safeLimit);
  return {
    messages: group.messages.slice(start, end),
    hasMore: start > 0,
    total,
  };
};

const registerGroupSocketHandlers = (io) => {
  const hasActiveSocketForMember = (code, memberId, exceptSocketId = null) => {
    for (const [socketId, sock] of io.sockets.sockets) {
      if (exceptSocketId && socketId === exceptSocketId) continue;
      if (sock.data.groupCode === code && sock.data.memberId === memberId) {
        return true;
      }
    }
    return false;
  };

  const emitGroupMembers = (code) => {
    if (!code || !groups.has(code)) return;
    const group = groups.get(code);
    io.to(code).emit('group-members', serializeMembers(group));
  };

  const removeSocketFromGroup = (socket) => {
    const code = socket.data.groupCode;
    const memberId = socket.data.memberId;
    if (!code || !groups.has(code)) {
      socket.data.groupCode = null;
      socket.data.memberId = null;
      socket.data.userName = null;
      return;
    }

    const group = groups.get(code);
    delete group.locations[socket.id];
    socket.leave(code);
    io.to(code).emit('group-locations', group.locations);

    if (memberId && group.members[memberId]) {
      if (!hasActiveSocketForMember(code, memberId, socket.id)) {
        group.members[memberId].online = false;
        group.members[memberId].lastSeen = new Date().toISOString();
      }
    }

    emitGroupMembers(code);

    if (Object.keys(group.members).length === 0 && group.messages.length === 0) {
      groups.delete(code);
    }

    socket.data.groupCode = null;
    socket.data.memberId = null;
    socket.data.userName = null;
  };

  const joinGroupForSocket = (socket, code, memberId, userName, asOwner = false) => {
    removeSocketFromGroup(socket);
    socket.join(code);
    socket.data.groupCode = code;
    socket.data.memberId = memberId;
    socket.data.userName = userName;

    const group = ensureGroup(code);
    if (!group.members[memberId]) {
      group.members[memberId] = {
        memberId,
        userName,
        role: asOwner ? 'owner' : 'member',
        muted: false,
        online: true,
        lastSeen: new Date().toISOString(),
        lastLat: null,
        lastLng: null,
      };
    }

    const member = group.members[memberId];
    member.userName = userName;
    member.online = true;
    member.lastSeen = new Date().toISOString();
    if (asOwner) {
      member.role = 'owner';
      group.ownerId = memberId;
    }

    socket.emit('group-joined', { code });
    socket.emit('group-history', group.messages.slice(-80));
    socket.emit('group-members', serializeMembers(group));
    io.to(code).emit('group-locations', group.locations);
    emitGroupMembers(code);
  };

  io.on('connection', (socket) => {
    socket.data.groupCode = null;
    socket.data.memberId = null;
    socket.data.userName = null;

    socket.on('request-group-history', (payload, callback) => {
      const code = socket.data.groupCode;
      if (!code || !groups.has(code)) {
        if (typeof callback === 'function') {
          callback({ ok: true, messages: [], hasMore: false, total: 0 });
        } else {
          socket.emit('group-history', []);
        }
        return;
      }

      const { messages, hasMore, total } = getPagedGroupHistory(
        groups.get(code),
        payload?.offset,
        payload?.limit
      );

      if (typeof callback === 'function') {
        callback({ ok: true, messages, hasMore, total });
        return;
      }

      socket.emit('group-history', messages);
    });

    socket.on('create-group', (_payload, callback) => {
      const memberId = normalizeMemberId(_payload?.userId);
      const userName = typeof _payload?.userName === 'string' && _payload.userName.trim() !== ''
        ? _payload.userName.trim()
        : '匿名游民';
      if (!memberId) {
        if (typeof callback === 'function') {
          callback({ ok: false, error: '缺少用户标识，请重新登录' });
        }
        return;
      }

      let code = generateGroupCode();
      while (groups.has(code)) {
        code = generateGroupCode();
      }

      ensureGroup(code);
      joinGroupForSocket(socket, code, memberId, userName, true);
      if (typeof callback === 'function') {
        callback({ ok: true, code });
      }
    });

    socket.on('join-group', (payload, callback) => {
      const code = normalizeGroupCode(payload?.code);
      const memberId = normalizeMemberId(payload?.userId);
      const userName = typeof payload?.userName === 'string' && payload.userName.trim() !== ''
        ? payload.userName.trim()
        : '匿名游民';
      if (!code) {
        if (typeof callback === 'function') {
          callback({ ok: false, error: '邀请码不能为空' });
        }
        return;
      }

      if (!memberId) {
        if (typeof callback === 'function') {
          callback({ ok: false, error: '缺少用户标识，请重新登录' });
        }
        return;
      }

      if (!groups.has(code)) {
        if (typeof callback === 'function') {
          callback({ ok: false, error: '邀请码不存在' });
        }
        return;
      }

      joinGroupForSocket(socket, code, memberId, userName, false);
      if (typeof callback === 'function') {
        callback({ ok: true, code });
      }
    });

    socket.on('request-group-members', () => {
      const code = socket.data.groupCode;
      if (!code || !groups.has(code)) {
        socket.emit('group-members', []);
        return;
      }
      socket.emit('group-members', serializeMembers(groups.get(code)));
    });

    socket.on('leave-group', (_payload, callback) => {
      removeSocketFromGroup(socket);
      if (typeof callback === 'function') {
        callback({ ok: true });
      }
    });

    socket.on('group-message', (payload, callback) => {
      const code = socket.data.groupCode;
      const memberId = socket.data.memberId;
      if (!code || !groups.has(code)) {
        if (typeof callback === 'function') {
          callback({ ok: false, error: '你还未加入群组' });
        }
        return;
      }

      const group = groups.get(code);
      const member = memberId ? group.members[memberId] : null;
      if (member && member.muted) {
        socket.emit('group-error', { message: '你已被群主禁言' });
        if (typeof callback === 'function') {
          callback({ ok: false, error: '你已被群主禁言' });
        }
        return;
      }

      const message = buildChatMessage(payload?.userName, payload?.text);
      if (!message.text) {
        if (typeof callback === 'function') {
          callback({ ok: false, error: '消息不能为空' });
        }
        return;
      }

      group.messages.push(message);
      if (group.messages.length > 300) {
        group.messages.splice(0, group.messages.length - 300);
      }

      io.to(code).emit('group-message', message);
      if (typeof callback === 'function') {
        callback({ ok: true, message });
      }
    });

    socket.on('update-location', (payload) => {
      const code = socket.data.groupCode;
      const memberId = socket.data.memberId;
      if (!code || !groups.has(code)) {
        return;
      }

      if (!payload || typeof payload.lat !== 'number' || typeof payload.lng !== 'number') {
        return;
      }

      const group = groups.get(code);
      group.locations[socket.id] = {
        lat: payload.lat,
        lng: payload.lng,
        memberId,
        userName: typeof payload.userName === 'string' && payload.userName.trim() !== ''
          ? payload.userName
          : '匿名用户',
      };

      if (memberId && group.members[memberId]) {
        group.members[memberId].online = true;
        group.members[memberId].lastSeen = new Date().toISOString();
        group.members[memberId].lastLat = payload.lat;
        group.members[memberId].lastLng = payload.lng;
      }

      io.to(code).emit('group-locations', group.locations);
      emitGroupMembers(code);
    });

    socket.on('mute-member', (payload, callback) => {
      const code = socket.data.groupCode;
      const requesterId = socket.data.memberId;
      const targetMemberId = normalizeMemberId(payload?.memberId);
      const muted = Boolean(payload?.muted);

      if (!code || !groups.has(code)) {
        if (typeof callback === 'function') callback({ ok: false, error: '你还未加入群组' });
        return;
      }

      const group = groups.get(code);
      if (!requesterId || requesterId !== group.ownerId) {
        if (typeof callback === 'function') callback({ ok: false, error: '仅群主可操作' });
        return;
      }

      if (!targetMemberId || !group.members[targetMemberId]) {
        if (typeof callback === 'function') callback({ ok: false, error: '成员不存在' });
        return;
      }

      if (targetMemberId === group.ownerId) {
        if (typeof callback === 'function') callback({ ok: false, error: '不能禁言群主' });
        return;
      }

      group.members[targetMemberId].muted = muted;
      emitGroupMembers(code);
      if (typeof callback === 'function') callback({ ok: true });
    });

    socket.on('kick-member', (payload, callback) => {
      const code = socket.data.groupCode;
      const requesterId = socket.data.memberId;
      const targetMemberId = normalizeMemberId(payload?.memberId);

      if (!code || !groups.has(code)) {
        if (typeof callback === 'function') callback({ ok: false, error: '你还未加入群组' });
        return;
      }

      const group = groups.get(code);
      if (!requesterId || requesterId !== group.ownerId) {
        if (typeof callback === 'function') callback({ ok: false, error: '仅群主可操作' });
        return;
      }

      if (!targetMemberId || !group.members[targetMemberId]) {
        if (typeof callback === 'function') callback({ ok: false, error: '成员不存在' });
        return;
      }

      if (targetMemberId === group.ownerId) {
        if (typeof callback === 'function') callback({ ok: false, error: '不能踢出群主' });
        return;
      }

      for (const [, sock] of io.sockets.sockets) {
        if (sock.data.groupCode === code && sock.data.memberId === targetMemberId) {
          sock.emit('kicked', { code, reason: '你已被群主移出群组' });
          removeSocketFromGroup(sock);
        }
      }

      delete group.members[targetMemberId];
      emitGroupMembers(code);
      if (typeof callback === 'function') callback({ ok: true });
    });

    socket.on('disconnect', () => {
      removeSocketFromGroup(socket);
    });
  });
};

module.exports = {
  registerGroupSocketHandlers,
};
