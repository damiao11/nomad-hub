#!/usr/bin/env node
/**
 * 测试账号创建脚本
 * 用法: cd backend && node scripts/createTestUser.js
 * 账号: test@163.com / Test1234!
 */

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'nomad_map',
};

const TEST_EMAIL = 'test@163.com';
const TEST_PASSWORD = 'Test1234!';
const TEST_USERNAME = '测试用户1234';

(async () => {
  const conn = await mysql.createConnection(DB_CONFIG);

  const [existing] = await conn.execute('SELECT id FROM User WHERE email = ?', [TEST_EMAIL]);
  if (existing.length > 0) {
    console.log('测试账号已存在:');
    console.log(`  ID:       ${existing[0].id}`);
    console.log(`  Email:    ${TEST_EMAIL}`);
    console.log(`  Password: ${TEST_PASSWORD}`);
    await conn.end();
    return;
  }

  const hash = await bcrypt.hash(TEST_PASSWORD, 10);

  const [cols] = await conn.execute("SHOW COLUMNS FROM User LIKE 'isAdmin'");
  if (cols.length > 0) {
    await conn.execute(
      'INSERT INTO User (userName, email, password, isAdmin) VALUES (?, ?, ?, ?)',
      [TEST_USERNAME, TEST_EMAIL, hash, 0]
    );
  } else {
    await conn.execute(
      'INSERT INTO User (userName, email, password) VALUES (?, ?, ?)',
      [TEST_USERNAME, TEST_EMAIL, hash]
    );
  }

  const [users] = await conn.execute('SELECT id, userName, email FROM User WHERE email = ?', [TEST_EMAIL]);
  const user = users[0];
  console.log('测试账号创建成功:');
  console.log(`  ID:       ${user.id}`);
  console.log(`  Email:    ${TEST_EMAIL}`);
  console.log(`  Password: ${TEST_PASSWORD}`);
  console.log(`  Username: ${user.userName}`);

  await conn.end();
})();
