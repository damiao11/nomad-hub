const { createConnection, normalizePhotoPayload } = require('../db/mysql');
const { moderateText } = require('../utils/contentModeration');

const SELECT_TRIP = 'SELECT id, name, lat, lng, userId, createdAt, IFNULL(note, "") AS note, IFNULL(photoUrl, "") AS photoUrl, IFNULL(category, "") AS category, IFNULL(isPublic, 1) AS isPublic FROM Trip';

const registerTripRoutes = (app) => {
  app.get('/api/trips', async (req, res) => {
    const { userId, q, category } = req.query;
    let conn;
    try {
      conn = await createConnection();
      let sql = SELECT_TRIP;
      const conditions = [];
      const params = [];

      if (userId) {
        conditions.push('userId = ?');
        params.push(userId);
      } else {
        // 不指定用户时只显示公开足迹
        conditions.push('isPublic = 1');
      }

      if (typeof q === 'string' && q.trim() !== '') {
        conditions.push('(name LIKE ? OR note LIKE ?)');
        params.push(`%${q.trim()}%`, `%${q.trim()}%`);
      }

      if (typeof category === 'string' && category.trim() !== '') {
        conditions.push('category = ?');
        params.push(category.trim());
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += ' ORDER BY createdAt DESC';

      const [rows] = await conn.execute(sql, params);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      if (conn) await conn.end();
    }
  });

  app.post('/api/trips', async (req, res) => {
    const { name, lat, lng, userId, note, photoUrl, category, isPublic } = req.body;
    const safeNote = typeof note === 'string' ? note : '';
    const safePhotoUrl = normalizePhotoPayload(photoUrl);
    const safeCategory = typeof category === 'string' ? category.trim().slice(0, 20) : '';
    const safeIsPublic = isPublic === false || isPublic === 0 ? 0 : 1;

    if (!userId) {
      return res.status(400).json({ error: '必须提供 userId' });
    }

    if (name) {
      const nameCheck = await moderateText(name);
      if (!nameCheck.pass) {
        return res.status(400).json({ error: nameCheck.reason || '足迹名称包含违规内容' });
      }
    }
    if (safeNote) {
      const noteCheck = await moderateText(safeNote);
      if (!noteCheck.pass) {
        return res.status(400).json({ error: noteCheck.reason || '备注包含违规内容' });
      }
    }

    let conn;
    try {
      conn = await createConnection();
      await conn.execute(
        'INSERT INTO Trip (name, lat, lng, userId, note, photoUrl, category, isPublic) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, lat, lng, userId, safeNote, safePhotoUrl, safeCategory, safeIsPublic]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      if (conn) await conn.end();
    }
  });

  app.put('/api/trips/:id', async (req, res) => {
    const { id } = req.params;
    const { userId, name, note, photoUrl, category, isPublic } = req.body;

    if (!userId) {
      return res.status(400).json({ error: '必须提供 userId' });
    }

    const safeName = typeof name === 'string' ? name.trim() : '';
    if (!safeName) {
      return res.status(400).json({ error: '足迹名称不能为空' });
    }

    const nameCheck = await moderateText(safeName);
    if (!nameCheck.pass) {
      return res.status(400).json({ error: nameCheck.reason || '足迹名称包含违规内容' });
    }

    const safeNote = typeof note === 'string' ? note : '';
    if (safeNote) {
      const noteCheck = await moderateText(safeNote);
      if (!noteCheck.pass) {
        return res.status(400).json({ error: noteCheck.reason || '备注包含违规内容' });
      }
    }
    const safePhotoUrl = normalizePhotoPayload(photoUrl);
    const safeCategory = typeof category === 'string' ? category.trim().slice(0, 20) : '';
    const safeIsPublic = isPublic === false || isPublic === 0 ? 0 : 1;

    let conn;
    try {
      conn = await createConnection();
      const [result] = await conn.execute(
        'UPDATE Trip SET name = ?, note = ?, photoUrl = ?, category = ?, isPublic = ? WHERE id = ? AND userId = ?',
        [safeName, safeNote, safePhotoUrl, safeCategory, safeIsPublic, id, userId]
      );

      if (result.affectedRows > 0) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: '未找到该足迹或无权限修改' });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      if (conn) await conn.end();
    }
  });

  app.delete('/api/trips/:id', async (req, res) => {
    const { id } = req.params;
    let conn;
    try {
      conn = await createConnection();
      const [result] = await conn.execute('DELETE FROM Trip WHERE id = ?', [id]);

      if (result.affectedRows > 0) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: '未找到该足迹' });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      if (conn) await conn.end();
    }
  });
};

module.exports = {
  registerTripRoutes,
};
