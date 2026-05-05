import { useEffect, useState } from 'react';
import { REGISTER_PASSWORD_RULE, REGISTER_EMAIL_RULE } from '@/lib/auth/authRules';

type AuthState = {
  isLoggedIn: boolean;
  userId: string | null;
  userName: string | null;
  avatar: string | null;
  isAdmin: boolean;
};

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    const storedUserName = localStorage.getItem('userName');
    const storedAvatar = localStorage.getItem('avatar');
    const storedIsAdmin = localStorage.getItem('isAdmin');
    if (storedUserId && storedUserName) {
      setUserId(storedUserId);
      setUserName(storedUserName);
      setAvatar(storedAvatar || null);
      setIsAdmin(storedIsAdmin === '1');
      setIsLoggedIn(true);
    }
  }, []);

  const applyLogin = (nextUserId: string, nextUserName: string, nextAvatar?: string, nextIsAdmin?: boolean) => {
    setUserId(nextUserId);
    setUserName(nextUserName);
    setAvatar(nextAvatar || null);
    setIsAdmin(!!nextIsAdmin);
    setIsLoggedIn(true);
    localStorage.setItem('userId', nextUserId);
    localStorage.setItem('userName', nextUserName);
    if (nextAvatar) localStorage.setItem('avatar', nextAvatar);
    if (nextIsAdmin) localStorage.setItem('isAdmin', '1');
    else localStorage.removeItem('isAdmin');
  };

  const clearAuth = () => {
    setUserId(null); setUserName(null); setAvatar(null); setIsAdmin(false); setIsLoggedIn(false);
    localStorage.removeItem('userId'); localStorage.removeItem('userName');
    localStorage.removeItem('avatar'); localStorage.removeItem('isAdmin');
  };

  const sendCode = async (apiBaseUrl: string, inputEmail: string) => {
    const email = inputEmail.trim();
    if (!email) return { ok: false as const, error: '请输入邮箱' };
    if (!REGISTER_EMAIL_RULE.test(email)) return { ok: false as const, error: '仅支持 gmail/163/126/qq' };
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/send-code`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      if (!response.ok) { const data = await response.json().catch(() => ({})); return { ok: false as const, error: data.error || '发送失败' }; }
      return { ok: true as const };
    } catch { return { ok: false as const, error: '网络错误' }; }
  };

  const register = async (apiBaseUrl: string, inputEmail: string, inputPassword: string, code: string) => {
    const email = inputEmail.trim(); const password = inputPassword;
    if (!email || !code || !password.trim()) return { ok: false as const, error: '请填写完整信息' };
    if (!REGISTER_EMAIL_RULE.test(email)) return { ok: false as const, error: '仅支持 gmail/163/126/qq' };
    if (!REGISTER_PASSWORD_RULE.test(password)) return { ok: false as const, error: '密码需为 8-16 位，且包含字母、数字和符号' };
    try {
      const response = await fetch(`${apiBaseUrl}/api/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, code }) });
      if (!response.ok) { const data = await response.json().catch(() => ({})); return { ok: false as const, error: data.error || '注册失败' }; }
      const data = await response.json();
      return { ok: true as const, userId: String(data.id), userName: String(data.userName), avatar: typeof data.avatar === 'string' ? data.avatar : '', isAdmin: !!data.isAdmin };
    } catch { return { ok: false as const, error: '网络错误' }; }
  };

  const login = async (apiBaseUrl: string, inputEmail: string, inputPassword: string) => {
    const email = inputEmail.trim(); const password = inputPassword;
    if (!email || !password.trim()) return { ok: false as const, error: '请输入邮箱和密码' };
    try {
      const response = await fetch(`${apiBaseUrl}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      if (!response.ok) { const data = await response.json().catch(() => ({})); return { ok: false as const, error: data.error || '邮箱或密码错误' }; }
      const data = await response.json();
      return { ok: true as const, userId: String(data.id), userName: String(data.userName), avatar: typeof data.avatar === 'string' ? data.avatar : '', isAdmin: !!data.isAdmin };
    } catch { return { ok: false as const, error: '网络错误' }; }
  };

  const resetPassword = async (apiBaseUrl: string, inputEmail: string, code: string, newPassword: string) => {
    const email = inputEmail.trim();
    if (!email || !code || !newPassword) return { ok: false as const, error: '请填写完整信息' };
    if (!REGISTER_PASSWORD_RULE.test(newPassword)) return { ok: false as const, error: '密码需为 8-16 位，且包含字母、数字和符号' };
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code, newPassword }) });
      if (!response.ok) { const data = await response.json().catch(() => ({})); return { ok: false as const, error: data.error || '重置失败' }; }
      return { ok: true as const };
    } catch { return { ok: false as const, error: '网络错误' }; }
  };

  const updateProfile = async (apiBaseUrl: string, updates: { userName?: string; avatar?: string }) => {
    if (!userId) return { ok: false as const, error: '请先登录' };
    try {
      const response = await fetch(`${apiBaseUrl}/api/user/profile`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, ...updates }) });
      if (!response.ok) { const data = await response.json().catch(() => ({})); return { ok: false as const, error: data.error || '修改失败' }; }
      const data = await response.json(); const user = data.user;
      setUserName(user.userName); setAvatar(user.avatar || null);
      localStorage.setItem('userName', user.userName);
      if (user.avatar) localStorage.setItem('avatar', user.avatar); else localStorage.removeItem('avatar');
      return { ok: true as const, userName: user.userName, avatar: user.avatar || '' };
    } catch { return { ok: false as const, error: '网络错误' }; }
  };

  const getAuthState = (): AuthState => ({ isLoggedIn, userId, userName, avatar, isAdmin });

  return { isLoggedIn, userId, userName, avatar, isAdmin, applyLogin, clearAuth, sendCode, register, login, resetPassword, updateProfile, getAuthState };
}
