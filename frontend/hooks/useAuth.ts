import { useEffect, useState } from 'react';
import { REGISTER_PASSWORD_RULE, REGISTER_EMAIL_RULE } from '@/lib/auth/authRules';

type AuthState = {
  isLoggedIn: boolean;
  userId: string | null;
  userName: string | null;
};

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    const storedUserName = localStorage.getItem('userName');
    if (storedUserId && storedUserName) {
      setUserId(storedUserId);
      setUserName(storedUserName);
      setIsLoggedIn(true);
    }
  }, []);

  const applyLogin = (nextUserId: string, nextUserName: string) => {
    setUserId(nextUserId);
    setUserName(nextUserName);
    setIsLoggedIn(true);
    localStorage.setItem('userId', nextUserId);
    localStorage.setItem('userName', nextUserName);
  };

  const clearAuth = () => {
    setUserId(null);
    setUserName(null);
    setIsLoggedIn(false);
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
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
      };
    } catch {
      return { ok: false as const, error: '网络错误' };
    }
  };

  const getAuthState = (): AuthState => ({
    isLoggedIn,
    userId,
    userName,
  });

  return {
    isLoggedIn,
    userId,
    userName,
    applyLogin,
    clearAuth,
    loginOrAutoRegister,
    getAuthState,
  };
}
