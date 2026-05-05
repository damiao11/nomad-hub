const codes = new Map();

// 生成6位验证码
const generateCode = () => String(Math.floor(100000 + Math.random() * 900000));

// 存储验证码，5分钟后过期
const setCode = (email) => {
  const code = generateCode();
  codes.set(email, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
  return code;
};

// 验证并消费验证码
const verifyCode = (email, code) => {
  const entry = codes.get(email);
  if (!entry) return false;
  codes.delete(email);
  if (Date.now() > entry.expiresAt) return false;
  return entry.code === String(code);
};

// 检查是否可发送（60秒内不能重复发送）
const canSend = (email) => {
  const entry = codes.get(email);
  if (!entry) return true;
  // 距离上次发送超过60秒
  return Date.now() - (entry.expiresAt - 5 * 60 * 1000) > 60 * 1000;
};

module.exports = { setCode, verifyCode, canSend };
