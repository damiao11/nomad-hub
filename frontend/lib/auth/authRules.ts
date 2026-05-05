export const REGISTER_PASSWORD_RULE = /^(?=\S{8,16}$)(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).*$/;
export const REGISTER_EMAIL_RULE = /^[a-zA-Z0-9._%+-]+@(gmail\.com|163\.com|126\.com|qq\.com)$/;

export const getEmailRuleError = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return '邮箱不能为空';
  }
  if (!REGISTER_EMAIL_RULE.test(trimmed)) {
    return '仅支持 gmail.com、163.com、126.com、qq.com';
  }
  return null;
};
