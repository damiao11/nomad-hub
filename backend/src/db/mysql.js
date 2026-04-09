const mysql = require('mysql2/promise');
const { DB_CONFIG } = require('../config/constants');

const createConnection = () => mysql.createConnection(DB_CONFIG);

const normalizePhotoPayload = (photoUrl) => {
  if (Array.isArray(photoUrl)) {
    const filtered = photoUrl.filter((item) => typeof item === 'string' && item.trim() !== '');
    return filtered.length > 0 ? JSON.stringify(filtered) : '';
  }

  if (typeof photoUrl === 'string') {
    return photoUrl;
  }

  return '';
};

const ensureTripPhotoLongText = async () => {
  let conn;
  try {
    conn = await createConnection();
    await conn.execute('ALTER TABLE Trip MODIFY COLUMN photoUrl LONGTEXT NULL');
    console.log('✅ 已确保 Trip.photoUrl 为 LONGTEXT');
  } catch (err) {
    console.warn('⚠️ 自动升级 Trip.photoUrl 为 LONGTEXT 失败：', err.message);
  } finally {
    if (conn) await conn.end();
  }
};

module.exports = {
  createConnection,
  normalizePhotoPayload,
  ensureTripPhotoLongText,
};
