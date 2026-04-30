const { createConnection } = require('../db/mysql');
const { REGISTER_PASSWORD_RULE, getEmailRuleError } = require('../utils/authRules');

const generateRandomName = () => {
  const adj = ['游牧', '自由', '远行', '探险', '流浪', '追风', '踏月', '逐日', '乘风', '山海'];
  const noun = ['旅人', '行者', '背包客', '游侠', '探索者', '摄影师', '骑手', '画师', '诗人', '歌者'];
  const num = Math.floor(Math.random() * 9000) + 1000;
  return adj[Math.floor(Math.random() * adj.length)] + noun[Math.floor(Math.random() * noun.length)] + num;
};

const registerAuthRoutes = (app) => {
  app.post('/api/register', async (req, res) => {
    const { password, email } = req.body;
    const safePassword = typeof password === 'string' ? password : '';
    const safeEmail = typeof email === 'string' ? email.trim() : '';

    if (!safePassword || !safeEmail) {
      return res.status(400).json({ error: '邮箱和密码不能为空' });
    }

    const emailRuleError = getEmailRuleError(safeEmail);
    if (emailRuleError) {
      return res.status(400).json({ error: emailRuleError });
    }

    if (!REGISTER_PASSWORD_RULE.test(safePassword)) {
      return res.status(400).json({ error: '密码需为 8-16 位，且包含字母、数字和符号' });
    }

    let conn;
    try {
      conn = await createConnection();

      const [existingEmail] = await conn.execute('SELECT * FROM User WHERE email = ?', [safeEmail]);
      if (existingEmail.length > 0) {
        return res.status(400).json({ error: '该邮箱已被注册' });
      }

      let userName;
      let attempts = 0;
      while (attempts < 10) {
        userName = generateRandomName();
        const [existingUser] = await conn.execute('SELECT * FROM User WHERE userName = ?', [userName]);
        if (existingUser.length === 0) break;
        attempts++;
      }

      await conn.execute('INSERT INTO User (userName, password, email) VALUES (?, ?, ?)', [userName, safePassword, safeEmail]);

      const [users] = await conn.execute('SELECT id, userName FROM User WHERE email = ?', [safeEmail]);
      const user = users[0];

      res.json({ success: true, id: user.id, userName: user.userName, message: '注册成功' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      if (conn) await conn.end();
    }
  });

  app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码不能为空' });
    }

    let conn;
    try {
      conn = await createConnection();
      const [users] = await conn.execute(
        'SELECT id, userName FROM User WHERE email = ? AND password = ?',
        [email, password]
      );

      if (users.length === 0) {
        return res.status(401).json({ error: '邮箱或密码错误' });
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
