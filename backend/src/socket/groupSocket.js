const { moderateText } = require('../utils/contentModeration');
const { createConnection } = require('../db/mysql');

const escapeHtml = (text) => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

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
  userName: escapeHtml(typeof userName === 'string' && userName.trim() !== '' ? userName.trim() : '匿名游民'),
  text: escapeHtml(typeof text === 'string' ? text.trim() : ''),
  createdAt: new Date().toISOString(),
});

// 从 DB 加载消息（分页）
const loadMessagesFromDB = async (code, offset = 0, limit = 30) => {
  let conn;
  try {
    conn = await createConnection();
    const [rows] = await conn.execute(
      'SELECT id, userName, text, createdAt FROM ChatMessages WHERE groupCode = ? ORDER BY createdAt ASC LIMIT ? OFFSET ?',
      [code, String(limit + 1), String(offset)]
    );
    const hasMore = rows.length > limit;
    const messages = (hasMore ? rows.slice(0, limit) : rows).map((r) => ({
      id: r.id,
      userName: r.userName,
      text: r.text,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    }));
    const [countRows] = await conn.execute(
      'SELECT COUNT(*) AS total FROM ChatMessages WHERE groupCode = ?', [code]
    );
    return { messages, hasMore, total: countRows[0].total };
  } catch (err) {
    console.warn('[chat] DB load error:', err.message);
    return { messages: [], hasMore: false, total: 0 };
  } finally {
    if (conn) await conn.end();
  }
};

// 保存消息到 DB
const saveMessageToDB = async (code, message) => {
  let conn;
  try {
    conn = await createConnection();
    await conn.execute(
      'INSERT INTO ChatMessages (id, groupCode, memberId, userName, text, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [message.id, code, '', message.userName, message.text, new Date(message.createdAt)]
    );
  } catch (err) {
    console.warn('[chat] DB save error:', err.message);
  } finally {
    if (conn) await conn.end();
  }
};

// 从 DB 删除消息
const deleteMessageFromDB = async (messageId) => {
  let conn;
  try {
    conn = await createConnection();
    await conn.execute('DELETE FROM ChatMessages WHERE id = ?', [messageId]);
    return true;
  } catch (err) {
    console.warn('[chat] DB delete error:', err.message);
    return false;
  } finally {
    if (conn) await conn.end();
  }
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

    if (Object.keys(group.members).length === 0) {
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
    socket.emit('group-members', serializeMembers(group));
    io.to(code).emit('group-locations', group.locations);
    emitGroupMembers(code);

    // 从 DB 加载最近消息
    loadMessagesFromDB(code, 0, 30).then(({ messages, hasMore, total }) => {
      socket.emit('group-history', { messages, hasMore, total });
    });
  };

  // 检查用户是否为管理员
  const checkIsAdmin = async (userId) => {
    let conn;
    try {
      conn = await createConnection();
      const [rows] = await conn.execute('SELECT isAdmin FROM User WHERE id = ?', [userId]);
      return rows.length > 0 && !!rows[0].isAdmin;
    } catch {
      return false;
    } finally {
      if (conn) await conn.end();
    }
  };

  io.on('connection', (socket) => {
    socket.data.groupCode = null;
    socket.data.memberId = null;
    socket.data.userName = null;

    socket.on('request-group-history', async (payload, callback) => {
      const code = socket.data.groupCode;
      if (!code || !groups.has(code)) {
        if (typeof callback === 'function') {
          callback({ ok: true, messages: [], hasMore: false, total: 0 });
        } else {
          socket.emit('group-history', { messages: [], hasMore: false, total: 0 });
        }
        return;
      }

      const limit = payload?.limit || 30;
      const offset = payload?.offset || 0;
      const { messages, hasMore, total } = await loadMessagesFromDB(code, offset, limit);

      if (typeof callback === 'function') {
        callback({ ok: true, messages, hasMore, total });
        return;
      }

      socket.emit('group-history', { messages, hasMore, total });
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

    socket.on('join-group', async (payload, callback) => {
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

      // 检查封禁状态
      let conn;
      try {
        conn = await createConnection();
        const [rows] = await conn.execute('SELECT isBanned FROM User WHERE id = ?', [memberId]);
        if (rows.length > 0 && rows[0].isBanned) {
          if (typeof callback === 'function') {
            callback({ ok: false, error: '该账号已被封禁，无法加入群组' });
          }
          return;
        }
      } catch { /* fail open */ } finally {
        if (conn) await conn.end();
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

    socket.on('group-message', async (payload, callback) => {
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

      const moderation = await moderateText(message.text);
      if (!moderation.pass) {
        socket.emit('group-error', { message: moderation.reason || '消息包含违规内容' });
        if (typeof callback === 'function') {
          callback({ ok: false, error: moderation.reason || '消息包含违规内容' });
        }
        return;
      }

      // 保存到 MySQL
      await saveMessageToDB(code, message);
      // 广播
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
        if (typeof callback === 'function') callback({ ok: false, error: '仅群主或管理员可操作' });
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

    // 管理员删除消息
    socket.on('admin-delete-message', async (payload, callback) => {
      const code = socket.data.groupCode;
      const requesterId = socket.data.memberId;
      const messageId = payload?.messageId;

      if (!requesterId || !messageId) {
        if (typeof callback === 'function') callback({ ok: false, error: '参数错误' });
        return;
      }

      const isAdmin = await checkIsAdmin(requesterId);
      if (!isAdmin) {
        if (typeof callback === 'function') callback({ ok: false, error: '仅管理员可操作' });
        return;
      }

      const deleted = await deleteMessageFromDB(messageId);
      if (deleted && code) {
        io.to(code).emit('admin-message-deleted', { messageId });
      }
      if (typeof callback === 'function') callback({ ok: deleted });
    });

    // 管理员封禁用户
    socket.on('admin-ban-member', async (payload, callback) => {
      const requesterId = socket.data.memberId;
      const targetMemberId = normalizeMemberId(payload?.memberId);
      const ban = Boolean(payload?.ban);

      if (!requesterId || !targetMemberId) {
        if (typeof callback === 'function') callback({ ok: false, error: '参数错误' });
        return;
      }

      const isAdmin = await checkIsAdmin(requesterId);
      if (!isAdmin) {
        if (typeof callback === 'function') callback({ ok: false, error: '仅管理员可操作' });
        return;
      }

      let conn;
      try {
        conn = await createConnection();
        await conn.execute('UPDATE User SET isBanned = ? WHERE id = ?', [ban ? 1 : 0, targetMemberId]);

        // 踢掉被封禁用户的所有连接
        if (ban) {
          for (const [, sock] of io.sockets.sockets) {
            if (sock.data.memberId === targetMemberId) {
              sock.emit('kicked', { code: sock.data.groupCode, reason: '你已被管理员封禁' });
              removeSocketFromGroup(sock);
            }
          }
        }

        if (typeof callback === 'function') callback({ ok: true });
      } catch (err) {
        if (typeof callback === 'function') callback({ ok: false, error: err.message });
      } finally {
        if (conn) await conn.end();
      }
    });

    socket.on('disconnect', () => {
      removeSocketFromGroup(socket);
    });
  });
};

module.exports = {
  registerGroupSocketHandlers,
};
