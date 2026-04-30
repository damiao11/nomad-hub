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

  const loginOrAutoRegister = async (apiBaseUrl: string, inputEmail: string, inputPassword: string) => {
    const email = inputEmail.trim();
    const password = inputPassword;

    if (!email) {
      return { ok: false as const, error: '请输入邮箱' };
    }

    if (!password.trim()) {
      return { ok: false as const, error: '请输入密码' };
    }

    if (!REGISTER_EMAIL_RULE.test(email)) {
      return { ok: false as const, error: '仅支持谷歌(gmail.com)、网易(163.com/126.com)和QQ邮箱(qq.com)' };
    }

    const loginRequest = async () => fetch(`${apiBaseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const registerRequest = async () => fetch(`${apiBaseUrl}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    try {
      let loginResponse = await loginRequest();

      if (!loginResponse.ok) {
        if (!REGISTER_PASSWORD_RULE.test(password)) {
          return { ok: false as const, error: '注册密码需为 8-16 位，且包含字母、数字和符号' };
        }

        const registerResponse = await registerRequest();
        if (!registerResponse.ok) {
          const registerData = await registerResponse.json().catch(() => ({}));
          return { ok: false as const, error: registerData.error || '注册失败' };
        }

        loginResponse = await loginRequest();
      }

      if (!loginResponse.ok) {
        const data = await loginResponse.json().catch(() => ({}));
        return { ok: false as const, error: data.error || '登录失败' };
      }

      const data = await loginResponse.json();
      return {
        ok: true as const,
        userId: String(data.id),
        userName: String(data.userName || email),
        avatar: typeof data.avatar === 'string' ? data.avatar : '',
      };
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
    loginOrAutoRegister,
    updateProfile,
    getAuthState,
  };
}
