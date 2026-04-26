const REGISTER_PASSWORD_RULE = /^(?=\S{8,16}$)(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).*$/;
const REGISTER_USERNAME_RULE = /^[A-Za-z0-9_\u4E00-\u9FFF]{2,20}$/;
const REGISTER_EMAIL_RULE = /^[a-zA-Z0-9._%+-]+@(gmail\.com|163\.com|126\.com|qq\.com)$/;
const RESERVED_USER_NAMES = new Set(['admin', 'administrator', 'root', 'system']);

const getUsernameRuleError = (value) => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (trimmed.length < 2 || trimmed.length > 20) {
    return '用户名需为 2-20 位';
  }
  // 如果用户名符合邮箱格式，允许通过用户名校验（后续由 email 规则统一处理）
  if (REGISTER_EMAIL_RULE.test(trimmed)) {
    return null;
  }
  if (!REGISTER_USERNAME_RULE.test(trimmed)) {
    return '用户名仅支持中文、字母、数字和下划线';
  }
  if (/^\d+$/.test(trimmed)) {
    return '用户名不能全为数字';
  }
  if (RESERVED_USER_NAMES.has(trimmed.toLowerCase())) {
    return '该用户名不可使用';
  }
  return null;
};

const getEmailRuleError = (value) => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) {
    return '邮箱不能为空';
  }
  if (!REGISTER_EMAIL_RULE.test(trimmed)) {
    return '仅支持谷歌(gmail.com)、网易(163.com/126.com)和QQ邮箱(qq.com)';
  }
  return null;
};

module.exports = {
  REGISTER_PASSWORD_RULE,
  getUsernameRuleError,
  getEmailRuleError,
};
