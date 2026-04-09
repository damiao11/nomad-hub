const { createConnection, normalizePhotoPayload } = require('../db/mysql');

const registerTripRoutes = (app) => {
  app.get('/api/trips', async (req, res) => {
    const { userId } = req.query;
    let conn;
    try {
      conn = await createConnection();
      let rows;

      if (userId) {
        [rows] = await conn.execute(
          'SELECT id, name, lat, lng, userId, createdAt, IFNULL(note, "") AS note, IFNULL(photoUrl, "") AS photoUrl FROM Trip WHERE userId = ? ORDER BY createdAt DESC',
          [userId]
        );
      } else {
        [rows] = await conn.execute(
          'SELECT id, name, lat, lng, userId, createdAt, IFNULL(note, "") AS note, IFNULL(photoUrl, "") AS photoUrl FROM Trip ORDER BY createdAt DESC'
        );
      }

      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      if (conn) await conn.end();
    }
  });

  app.post('/api/trips', async (req, res) => {
    const { name, lat, lng, userId, note, photoUrl } = req.body;
    const safeNote = typeof note === 'string' ? note : '';
    const safePhotoUrl = normalizePhotoPayload(photoUrl);

    if (!userId) {
      return res.status(400).json({ error: '必须提供 userId' });
    }

    let conn;
    try {
      conn = await createConnection();
      await conn.execute(
        'INSERT INTO Trip (name, lat, lng, userId, note, photoUrl) VALUES (?, ?, ?, ?, ?, ?)',
        [name, lat, lng, userId, safeNote, safePhotoUrl]
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
    const { userId, name, note, photoUrl } = req.body;

    if (!userId) {
      return res.status(400).json({ error: '必须提供 userId' });
    }

    const safeName = typeof name === 'string' ? name.trim() : '';
    if (!safeName) {
      return res.status(400).json({ error: '足迹名称不能为空' });
    }

    const safeNote = typeof note === 'string' ? note : '';
    const safePhotoUrl = normalizePhotoPayload(photoUrl);

    let conn;
    try {
      conn = await createConnection();
      const [result] = await conn.execute(
        'UPDATE Trip SET name = ?, note = ?, photoUrl = ? WHERE id = ? AND userId = ?',
        [safeName, safeNote, safePhotoUrl, id, userId]
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
