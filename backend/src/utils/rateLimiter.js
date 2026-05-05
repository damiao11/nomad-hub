const attempts = new Map();

// 清理过期记录
const prune = () => {
  const now = Date.now();
  for (const [key, entry] of attempts) {
    if (now > entry.resetAt) attempts.delete(key);
  }
};

// 每 60 秒清理一次
setInterval(prune, 60 * 1000);

const createLimiter = (key, maxAttempts, windowMs) => {
  prune();
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return { blocked: false };
  }

  entry.count += 1;
  if (entry.count > maxAttempts) {
    return {
      blocked: true,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  return { blocked: false };
};

// 登录限流：每个 IP 每分钟最多 5 次
const checkLoginRate = (ip) => createLimiter(`login:${ip}`, 5, 60 * 1000);

// 发送验证码限流：每个邮箱每小时最多 5 次
const checkSendCodeRate = (email) => createLimiter(`code:${email}`, 5, 60 * 60 * 1000);

module.exports = { checkLoginRate, checkSendCodeRate };
