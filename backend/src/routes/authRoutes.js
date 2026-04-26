const { createConnection } = require('../db/mysql');
const { REGISTER_PASSWORD_RULE, getUsernameRuleError, getEmailRuleError } = require('../utils/authRules');

const registerAuthRoutes = (app) => {
  app.post('/api/register', async (req, res) => {
    const { userName, password, email } = req.body;
    const safeUserName = typeof userName === 'string' ? userName.trim() : '';
    const safePassword = typeof password === 'string' ? password : '';
    const safeEmail = typeof email === 'string' ? email.trim() : '';

    if (!safeUserName || !safePassword || !safeEmail) {
      return res.status(400).json({ error: '用户名、密码和邮箱不能为空' });
    }

    // 强制注册必须使用邮箱作为用户名或者提供专门的邮箱
    if (!REGISTER_EMAIL_RULE.test(safeEmail) && !REGISTER_EMAIL_RULE.test(safeUserName)) {
      return res.status(400).json({ error: '注册必须使用有效的邮箱地址' });
    }

    const emailRuleError = getEmailRuleError(safeEmail);
    if (emailRuleError) {
      return res.status(400).json({ error: emailRuleError });
    }

    const usernameRuleError = getUsernameRuleError(safeUserName);
    if (usernameRuleError) {
      return res.status(400).json({ error: usernameRuleError });
    }

    if (!REGISTER_PASSWORD_RULE.test(safePassword)) {
      return res.status(400).json({ error: '密码需为 8-16 位，且包含字母、数字和符号' });
    }

    let conn;
    try {
      conn = await createConnection();
      
      // 检查邮箱是否已存在
      const [existingEmail] = await conn.execute('SELECT * FROM User WHERE email = ?', [safeEmail]);
      if (existingEmail.length > 0) {
        return res.status(400).json({ error: '该邮箱已被注册' });
      }

      const [existingUser] = await conn.execute('SELECT * FROM User WHERE userName = ?', [safeUserName]);
      if (existingUser.length > 0) {
        return res.status(400).json({ error: '用户名已存在' });
      }

      await conn.execute('INSERT INTO User (userName, password, email) VALUES (?, ?, ?)', [safeUserName, safePassword, safeEmail]);

      res.json({ success: true, message: '注册成功' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      if (conn) await conn.end();
    }
  });

  app.post('/api/login', async (req, res) => {
    const { userName, password } = req.body;

    if (!userName || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    let conn;
    try {
      conn = await createConnection();
      // 支持用户名或邮箱登录
      const [users] = await conn.execute(
        'SELECT id, userName FROM User WHERE (userName = ? OR email = ?) AND password = ?',
        [userName, userName, password]
      );

      if (users.length === 0) {
        return res.status(401).json({ error: '账号或密码错误' });
      }

      const user = users[0];
      res.json({ success: true, id: user.id, userName: user.userName });
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
