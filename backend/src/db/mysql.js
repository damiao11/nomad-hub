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

const ensureUserEmailColumn = async () => {
  let conn;
  try {
    conn = await createConnection();
    const [columns] = await conn.execute('SHOW COLUMNS FROM User LIKE "email"');
    if (columns.length === 0) {
      await conn.execute('ALTER TABLE User ADD COLUMN email VARCHAR(255) UNIQUE AFTER userName');
      console.log('✅ 已为 User 表添加 email 列');
    }
  } catch (err) {
    console.warn('⚠️ 自动为 User 表添加 email 列失败：', err.message);
  } finally {
    if (conn) await conn.end();
  }
};

const ensureUserAvatarColumn = async () => {
  let conn;
  try {
    conn = await createConnection();
    const [columns] = await conn.execute('SHOW COLUMNS FROM User LIKE "avatar"');
    if (columns.length === 0) {
      await conn.execute('ALTER TABLE User ADD COLUMN avatar LONGTEXT NULL AFTER email');
      console.log('✅ 已为 User 表添加 avatar 列');
    }
  } catch (err) {
    console.warn('⚠️ 自动为 User 表添加 avatar 列失败：', err.message);
  } finally {
    if (conn) await conn.end();
  }
};

module.exports = {
  createConnection,
  normalizePhotoPayload,
  ensureTripPhotoLongText,
  ensureUserEmailColumn,
  ensureUserAvatarColumn,
};
