const { createConnection } = require('../db/mysql');
const { REGISTER_PASSWORD_RULE, getUsernameRuleError } = require('../utils/authRules');

const registerAuthRoutes = (app) => {
  app.post('/api/register', async (req, res) => {
    const { userName, password } = req.body;
    const safeUserName = typeof userName === 'string' ? userName.trim() : '';
    const safePassword = typeof password === 'string' ? password : '';

    if (!safeUserName || !safePassword) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
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
      const [existingUser] = await conn.execute('SELECT * FROM User WHERE userName = ?', [safeUserName]);
      if (existingUser.length > 0) {
        return res.status(400).json({ error: '用户名已存在' });
      }

      await conn.execute('INSERT INTO User (userName, password) VALUES (?, ?)', [safeUserName, safePassword]);

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
      const [users] = await conn.execute(
        'SELECT id, userName FROM User WHERE userName = ? AND password = ?',
        [userName, password]
      );

      if (users.length === 0) {
        return res.status(401).json({ error: '用户名或密码错误' });
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
