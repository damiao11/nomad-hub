'use client';

import { useState } from 'react';
import { getUsernameRuleError, REGISTER_USERNAME_ALLOWED_CHARS_RULE } from '@/lib/auth/authRules';

type LoginPanelProps = {
  apiBaseUrl: string;
  isLoggedIn: boolean;
  userName: string | null;
  onLoginSuccess: (userId: string, userName: string) => void;
  onLogout: () => void;
  loginOrAutoRegister: (apiBaseUrl: string, userName: string, password: string) => Promise<
    | { ok: true; userId: string; userName: string }
    | { ok: false; error: string }
  >;
};

export default function LoginPanel({
  apiBaseUrl,
  isLoggedIn,
  userName,
  onLoginSuccess,
  onLogout,
  loginOrAutoRegister,
}: LoginPanelProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const trimmedUsername = username.trim();
  const hasUsernameInput = trimmedUsername.length > 0;
  const usernameRuleError = getUsernameRuleError(username);
  const shouldShowUsernameRuleHint = hasUsernameInput
    && Boolean(usernameRuleError)
    && !(trimmedUsername.length === 1 && REGISTER_USERNAME_ALLOWED_CHARS_RULE.test(trimmedUsername));

  const handleAuth = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const result = await loginOrAutoRegister(apiBaseUrl, username, password);
      if (!result.ok) {
        setErrorMsg(result.error);
        return;
      }

      onLoginSuccess(result.userId, result.userName);
      setUsername('');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      onLogout();
      setUsername('');
      setPassword('');
    }
  };

  return (
    <div className={isLoggedIn ? 'absolute right-3 z-[1000] rounded-xl border border-white/25 bg-white/55 p-3 shadow-sm backdrop-blur-md mobile-safe-top [--safe-top-base:5rem] md:right-4 md:top-4 md:[--safe-top-base:1rem]' : 'absolute left-1/2 top-1/2 z-[1000] -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded-lg shadow-lg'}>
      {!isLoggedIn ? (
        <div className="w-64 space-y-3">
          <h3 className="font-bold text-lg">登录/注册</h3>
          <input
            type="text"
            placeholder="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleAuth();
              }
            }}
            className="w-full border border-gray-300 rounded px-3 py-2 text-xs placeholder:text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {shouldShowUsernameRuleHint && (
            <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700">
              用户名规则：2-20 位，仅中文/字母/数字/下划线，不能全数字
            </div>
          )}
          <input
            type="password"
            placeholder="密码需 8-16 位，包含字母、数字和符号"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleAuth();
              }
            }}
            className="w-full border border-gray-300 rounded px-3 py-2 text-xs placeholder:text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errorMsg && <div className="text-red-500 text-sm">{errorMsg}</div>}
          <div className="flex gap-2">
            <button
              onClick={() => {
                void handleAuth();
              }}
              disabled={loading}
              className="flex-1 bg-[#7E9D82] hover:bg-[#6F8B73] text-white px-3 py-2 rounded text-sm disabled:opacity-50"
            >
              登录 / 自动注册
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-sm text-slate-700">
            <p className="font-semibold">欢迎，{userName}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-[#7E9D82] hover:bg-[#6F8B73] text-white px-3 py-2 rounded text-sm"
          >
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}
