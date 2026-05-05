import { useEffect, useState } from 'react';
import { REGISTER_PASSWORD_RULE, REGISTER_EMAIL_RULE } from '@/lib/auth/authRules';

type AuthState = {
  isLoggedIn: boolean;
  userId: string | null;
  userName: string | null;
  avatar: string | null;
};

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    const storedUserName = localStorage.getItem('userName');
    const storedAvatar = localStorage.getItem('avatar');
    if (storedUserId && storedUserName) {
      setUserId(storedUserId);
      setUserName(storedUserName);
      setAvatar(storedAvatar || null);
      setIsLoggedIn(true);
    }
  }, []);

  const applyLogin = (nextUserId: string, nextUserName: string, nextAvatar?: string) => {
    setUserId(nextUserId);
    setUserName(nextUserName);
    setAvatar(nextAvatar || null);
    setIsLoggedIn(true);
    localStorage.setItem('userId', nextUserId);
    localStorage.setItem('userName', nextUserName);
    if (nextAvatar) {
      localStorage.setItem('avatar', nextAvatar);
    }
  };

  const clearAuth = () => {
    setUserId(null);
    setUserName(null);
    setAvatar(null);
    setIsLoggedIn(false);
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('avatar');
  };

  // 发送邮箱验证码
  const sendCode = async (apiBaseUrl: string, inputEmail: string) => {
    const email = inputEmail.trim();
    if (!email) {
      return { ok: false as const, error: '请输入邮箱' };
    }
    if (!REGISTER_EMAIL_RULE.test(email)) {
      return { ok: false as const, error: '仅支持谷歌/网易/QQ邮箱' };
    }
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return { ok: false as const, error: data.error || '发送失败' };
      }
      return { ok: true as const };
    } catch {
      return { ok: false as const, error: '网络错误' };
    }
  };

  // 注册（需要验证码）
  const register = async (apiBaseUrl: string, inputEmail: string, inputPassword: string, code: string) => {
    const email = inputEmail.trim();
    const password = inputPassword;

    if (!email || !code || !password.trim()) {
      return { ok: false as const, error: '请填写完整信息' };
    }
    if (!REGISTER_EMAIL_RULE.test(email)) {
      return { ok: false as const, error: '仅支持谷歌/网易/QQ邮箱' };
    }
    if (!REGISTER_PASSWORD_RULE.test(password)) {
      return { ok: false as const, error: '密码需为 8-16 位，且包含字母、数字和符号' };
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, code }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return { ok: false as const, error: data.error || '注册失败' };
      }
      const data = await response.json();
      return {
        ok: true as const,
        userId: String(data.id),
        userName: String(data.userName),
        avatar: typeof data.avatar === 'string' ? data.avatar : '',
      };
    } catch {
      return { ok: false as const, error: '网络错误' };
    }
  };

  // 登录
  const login = async (apiBaseUrl: string, inputEmail: string, inputPassword: string) => {
    const email = inputEmail.trim();
    const password = inputPassword;

    if (!email || !password.trim()) {
      return { ok: false as const, error: '请输入邮箱和密码' };
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return { ok: false as const, error: data.error || '邮箱或密码错误' };
      }
      const data = await response.json();
      return {
        ok: true as const,
        userId: String(data.id),
        userName: String(data.userName),
        avatar: typeof data.avatar === 'string' ? data.avatar : '',
      };
    } catch {
      return { ok: false as const, error: '网络错误' };
    }
  };

  // 重置密码
  const resetPassword = async (apiBaseUrl: string, inputEmail: string, code: string, newPassword: string) => {
    const email = inputEmail.trim();
    if (!email || !code || !newPassword) {
      return { ok: false as const, error: '请填写完整信息' };
    }
    if (!REGISTER_PASSWORD_RULE.test(newPassword)) {
      return { ok: false as const, error: '密码需为 8-16 位，且包含字母、数字和符号' };
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return { ok: false as const, error: data.error || '重置失败' };
      }
      return { ok: true as const };
    } catch {
      return { ok: false as const, error: '网络错误' };
    }
  };

  const updateProfile = async (apiBaseUrl: string, updates: { userName?: string; avatar?: string }) => {
    if (!userId) {
      return { ok: false as const, error: '请先登录' };
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/user/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...updates }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return { ok: false as const, error: data.error || '修改失败' };
      }

      const data = await response.json();
      const user = data.user;
      setUserName(user.userName);
      setAvatar(user.avatar || null);
      localStorage.setItem('userName', user.userName);
      if (user.avatar) {
        localStorage.setItem('avatar', user.avatar);
      } else {
        localStorage.removeItem('avatar');
      }

      return { ok: true as const, userName: user.userName, avatar: user.avatar || '' };
    } catch {
      return { ok: false as const, error: '网络错误' };
    }
  };

  const getAuthState = (): AuthState => ({
    isLoggedIn,
    userId,
    userName,
    avatar,
  });

  return {
    isLoggedIn,
    userId,
    userName,
    avatar,
    applyLogin,
    clearAuth,
    sendCode,
    register,
    login,
    resetPassword,
    updateProfile,
    getAuthState,
  };
}
