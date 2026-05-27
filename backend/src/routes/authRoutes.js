const bcrypt = require('bcryptjs');
const { createConnection } = require('../db/mysql');
const { REGISTER_PASSWORD_RULE, REGISTER_EMAIL_RULE, getEmailRuleError } = require('../utils/authRules');
const { moderateText } = require('../utils/contentModeration');
const { sendVerificationCode } = require('../utils/mailer');
const { setCode, verifyCode, canSend } = require('../utils/verificationCodes');
const { checkLoginRate, checkSendCodeRate } = require('../utils/rateLimiter');

const BCRYPT_ROUNDS = 10;

const generateRandomName = () => {
  const adj = ['游牧', '自由', '远行', '探险', '流浪', '追风', '踏月', '逐日', '乘风', '山海'];
  const noun = ['旅人', '行者', '背包客', '游侠', '探索者', '摄影师', '骑手', '画师', '诗人', '歌者'];
  const num = Math.floor(Math.random() * 9000) + 1000;
  return adj[Math.floor(Math.random() * adj.length)] + noun[Math.floor(Math.random() * noun.length)] + num;
};

const registerAuthRoutes = (app) => {
  // 发送邮箱验证码
  app.post('/api/auth/send-code', async (req, res) => {
    const { email } = req.body;
    const safeEmail = typeof email === 'string' ? email.trim() : '';

    const emailError = getEmailRuleError(safeEmail);
    if (emailError) {
      return res.status(400).json({ error: emailError });
    }

    const codeRate = checkSendCodeRate(safeEmail);
    if (codeRate.blocked) {
      return res.status(429).json({ error: `发送太频繁，请${codeRate.retryAfter}秒后再试` });
    }

    if (!canSend(safeEmail)) {
      return res.status(429).json({ error: '发送太频繁，请30秒后再试' });
    }

    try {
      const code = setCode(safeEmail);
      await sendVerificationCode(safeEmail, code);
      res.json({ ok: true });
    } catch (err) {
      console.warn('[邮件] 发送失败:', err.message);
      res.status(500).json({ error: '验证码发送失败，请检查邮箱地址或稍后重试' });
    }
  });

  // 注册（需要验证码）
  app.post('/api/register', async (req, res) => {
    const { password, email, code } = req.body;
    const safePassword = typeof password === 'string' ? password : '';
    const safeEmail = typeof email === 'string' ? email.trim() : '';
    const safeCode = typeof code === 'string' ? code.trim() : '';

    if (!safePassword || !safeEmail) {
      return res.status(400).json({ error: '邮箱和密码不能为空' });
    }

    const emailError = getEmailRuleError(safeEmail);
    if (emailError) {
      return res.status(400).json({ error: emailError });
    }

    if (!safeCode) {
      return res.status(400).json({ error: '请输入邮箱验证码' });
    }

    if (!verifyCode(safeEmail, safeCode)) {
      return res.status(400).json({ error: '验证码错误或已过期，请重新获取' });
    }

    if (!REGISTER_PASSWORD_RULE.test(safePassword)) {
      return res.status(400).json({ error: '密码需为 8-16 位，且包含字母、数字和符号' });
    }

    let conn;
    try {
      conn = await createConnection();

      const [existingEmail] = await conn.execute('SELECT * FROM User WHERE email = ?', [safeEmail]);
      if (existingEmail.length > 0) {
        return res.status(400).json({ error: '该邮箱已被注册，请直接登录' });
      }

      let userName;
      let attempts = 0;
      while (attempts < 10) {
        userName = generateRandomName();
        const [existingUser] = await conn.execute('SELECT * FROM User WHERE userName = ?', [userName]);
        if (existingUser.length === 0) break;
        attempts++;
      }

      const hash = await bcrypt.hash(safePassword, BCRYPT_ROUNDS);
      await conn.execute('INSERT INTO User (userName, password, email) VALUES (?, ?, ?)', [userName, hash, safeEmail]);

      const [users] = await conn.execute('SELECT id, userName, IFNULL(avatar, "") AS avatar FROM User WHERE email = ?', [safeEmail]);
      const user = users[0];

      res.json({ success: true, id: user.id, userName: user.userName, avatar: user.avatar, message: '注册成功' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      if (conn) await conn.end();
    }
  });

  // 登录
  app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    const ip = req.ip || req.connection?.remoteAddress || '0.0.0.0';
    const rate = checkLoginRate(ip);
    if (rate.blocked) {
      return res.status(429).json({ error: `登录尝试过多，请${rate.retryAfter}秒后再试` });
    }

    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码不能为空' });
    }

    let conn;
    try {
      conn = await createConnection();
      const [rows] = await conn.execute(
        'SELECT id, userName, password, IFNULL(avatar, "") AS avatar, isAdmin, isBanned FROM User WHERE email = ?',
        [email]
      );

      if (rows.length === 0) {
        return res.status(401).json({ error: '邮箱或密码错误' });
      }

      const user = rows[0];

      if (user.isBanned) {
        return res.status(403).json({ error: '该账号已被封禁' });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ error: '邮箱或密码错误' });
      }
      res.json({ success: true, id: user.id, userName: user.userName, avatar: user.avatar, isAdmin: !!user.isAdmin });
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      if (conn) await conn.end();
    }
  });

  // 重置密码
  app.post('/api/auth/reset-password', async (req, res) => {
    const { email, code, newPassword } = req.body;
    const safeEmail = typeof email === 'string' ? email.trim() : '';
    const safeCode = typeof code === 'string' ? code.trim() : '';
    const safePassword = typeof newPassword === 'string' ? newPassword : '';

    if (!safeEmail || !safeCode || !safePassword) {
      return res.status(400).json({ error: '邮箱、验证码和新密码不能为空' });
    }

    if (!verifyCode(safeEmail, safeCode)) {
      return res.status(400).json({ error: '验证码错误或已过期' });
    }

    if (!REGISTER_PASSWORD_RULE.test(safePassword)) {
      return res.status(400).json({ error: '密码需为 8-16 位，且包含字母、数字和符号' });
    }

    let conn;
    try {
      conn = await createConnection();
      const [users] = await conn.execute('SELECT id FROM User WHERE email = ?', [safeEmail]);
      if (users.length === 0) {
        return res.status(404).json({ error: '该邮箱未注册' });
      }

      const hash = await bcrypt.hash(safePassword, BCRYPT_ROUNDS);
      await conn.execute('UPDATE User SET password = ? WHERE email = ?', [hash, safeEmail]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      if (conn) await conn.end();
    }
  });

  // 修改用户资料
  app.put('/api/user/profile', async (req, res) => {
    const { userId, userName, avatar } = req.body;

    if (!userId) {
      return res.status(400).json({ error: '必须提供 userId' });
    }

    let conn;
    try {
      conn = await createConnection();

      const [users] = await conn.execute('SELECT * FROM User WHERE id = ?', [userId]);
      if (users.length === 0) {
        return res.status(404).json({ error: '用户不存在' });
      }

      const updates = [];
      const values = [];

      if (typeof userName === 'string' && userName.trim() !== '') {
        const safeName = userName.trim();
        if (safeName.length < 2 || safeName.length > 20) {
          return res.status(400).json({ error: '用户名需为 2-20 位' });
        }
        const nameCheck = await moderateText(safeName);
        if (!nameCheck.pass) {
          return res.status(400).json({ error: nameCheck.reason || '用户名包含违规内容' });
        }
        const [dup] = await conn.execute('SELECT id FROM User WHERE userName = ? AND id != ?', [safeName, userId]);
        if (dup.length > 0) {
          return res.status(400).json({ error: '该用户名已被使用' });
        }
        updates.push('userName = ?');
        values.push(safeName);
      }

      if (typeof avatar === 'string') {
        updates.push('avatar = ?');
        values.push(avatar);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: '没有要修改的内容' });
      }

      values.push(userId);
      await conn.execute(`UPDATE User SET ${updates.join(', ')} WHERE id = ?`, values);

      const [updated] = await conn.execute('SELECT id, userName, IFNULL(avatar, "") AS avatar FROM User WHERE id = ?', [userId]);
      res.json({ success: true, user: updated[0] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      if (conn) await conn.end();
    }
  });
};

  // 修改密码（已登录用户在个人面板中修改）
  app.put('/api/user/password', async (req, res) => {
    const { userId, oldPassword, newPassword } = req.body;

    if (!userId || !oldPassword || !newPassword) {
      return res.status(400).json({ error: '必须提供 userId、旧密码和新密码' });
    }

    if (!REGISTER_PASSWORD_RULE.test(newPassword)) {
      return res.status(400).json({ error: '新密码需为 8-16 位，且包含字母、数字和符号' });
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({ error: '新密码不能与旧密码相同' });
    }

    let conn;
    try {
      conn = await createConnection();
      const [rows] = await conn.execute('SELECT password FROM User WHERE id = ?', [userId]);
      if (rows.length === 0) {
        return res.status(404).json({ error: '用户不存在' });
      }

      const match = await bcrypt.compare(oldPassword, rows[0].password);
      if (!match) {
        return res.status(400).json({ error: '旧密码错误' });
      }

      const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      await conn.execute('UPDATE User SET password = ? WHERE id = ?', [hash, userId]);

      res.json({ success: true, message: '密码修改成功' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      if (conn) await conn.end();
    }
  });

  // 注销账户
  app.delete('/api/user/account', async (req, res) => {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.status(400).json({ error: '必须提供 userId 和密码' });
    }

    let conn;
    try {
      conn = await createConnection();
      const [rows] = await conn.execute('SELECT password FROM User WHERE id = ?', [userId]);
      if (rows.length === 0) {
        return res.status(404).json({ error: '用户不存在' });
      }

      const match = await bcrypt.compare(password, rows[0].password);
      if (!match) {
        return res.status(400).json({ error: '密码错误' });
      }

      await conn.execute('DELETE FROM ChatMessages WHERE memberId = ?', [userId]);
      await conn.execute('DELETE FROM Trip WHERE userId = ?', [userId]);
      await conn.execute('DELETE FROM User WHERE id = ?', [userId]);

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      if (conn) await conn.end();
    }
  });
};

module.exports = {
  registerAuthRoutes,
};
