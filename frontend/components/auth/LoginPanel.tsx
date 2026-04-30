'use client';

import { useRef, useState } from 'react';
import { getEmailRuleError } from '@/lib/auth/authRules';

type LoginPanelProps = {
  apiBaseUrl: string;
  isLoggedIn: boolean;
  userName: string | null;
  avatar: string | null;
  onLoginSuccess: (userId: string, userName: string, avatar?: string) => void;
  onLogout: () => void;
  loginOrAutoRegister: (apiBaseUrl: string, email: string, password: string) => Promise<
    | { ok: true; userId: string; userName: string; avatar?: string }
    | { ok: false; error: string }
  >;
  updateProfile: (apiBaseUrl: string, updates: { userName?: string; avatar?: string }) => Promise<
    | { ok: true; userName: string; avatar?: string }
    | { ok: false; error: string }
  >;
};

const AVATAR_SIZE = 128;

const compressAvatar = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('仅支持图片文件'));
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = Math.min(img.naturalWidth, img.naturalHeight, AVATAR_SIZE);
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('压缩失败'));
        return;
      }

      // 居中裁剪
      const sx = (img.naturalWidth - size) / 2;
      const sy = (img.naturalHeight - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);

      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片读取失败'));
    };

    img.src = url;
  });
};

export default function LoginPanel({
  apiBaseUrl,
  isLoggedIn,
  userName,
  avatar,
  onLoginSuccess,
  onLogout,
  loginOrAutoRegister,
  updateProfile,
}: LoginPanelProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // 编辑状态
  const [editName, setEditName] = useState('');
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAuth = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const result = await loginOrAutoRegister(apiBaseUrl, email, password);
      if (!result.ok) {
        setErrorMsg(result.error);
        return;
      }
      onLoginSuccess(result.userId, result.userName, result.avatar);
      setEmail('');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      onLogout();
      setEmail('');
      setPassword('');
      setProfileOpen(false);
      setEditOpen(false);
    }
  };

  const openEdit = () => {
    setEditName(userName || '');
    setEditAvatarFile(null);
    setEditAvatarPreview(null);
    setEditError('');
    setEditOpen(true);
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEditAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setEditAvatarPreview(typeof reader.result === 'string' ? reader.result : null);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError('用户名不能为空');
      return;
    }
    if (trimmed.length < 2 || trimmed.length > 20) {
      setEditError('用户名需为 2-20 位');
      return;
    }

    setEditSaving(true);
    setEditError('');

    try {
      let avatarBase64: string | undefined;
      if (editAvatarFile) {
        try {
          avatarBase64 = await compressAvatar(editAvatarFile);
        } catch (err) {
          setEditError(err instanceof Error ? err.message : '头像压缩失败');
          setEditSaving(false);
          return;
        }
      }

      const updates: { userName?: string; avatar?: string } = {};
      if (trimmed !== userName) {
        updates.userName = trimmed;
      }
      if (avatarBase64 !== undefined) {
        updates.avatar = avatarBase64;
      }

      if (Object.keys(updates).length === 0) {
        setEditOpen(false);
        setEditSaving(false);
        return;
      }

      const result = await updateProfile(apiBaseUrl, updates);
      if (!result.ok) {
        setEditError(result.error);
        return;
      }

      setEditOpen(false);
    } catch {
      setEditError('网络错误');
    } finally {
      setEditSaving(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="absolute left-1/2 top-1/2 z-[1000] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-4 shadow-lg">
        <div className="w-64 space-y-3">
          <h3 className="font-bold text-lg">登录 / 注册</h3>
          <p className="text-xs text-gray-500">输入邮箱和密码，新用户将自动注册</p>
          <input
            type="email"
            placeholder="邮箱（仅支持谷歌/网易/QQ）"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleAuth();
              }
            }}
            className="w-full border border-gray-300 rounded px-3 py-2 text-xs placeholder:text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {email && getEmailRuleError(email) && (
            <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] text-amber-700">
              仅支持：@gmail.com, @163.com, @126.com, @qq.com
            </div>
          )}
          <input
            type="password"
            placeholder="密码（8-16位，含字母、数字和符号）"
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
          {errorMsg && <div className="text-red-500 text-xs">{errorMsg}</div>}
          <button
            onClick={() => {
              void handleAuth();
            }}
            disabled={loading}
            className="w-full bg-[#7E9D82] hover:bg-[#6F8B73] text-white px-3 py-2 rounded text-sm disabled:opacity-50"
          >
            {loading ? '请稍候...' : '登录 / 注册'}
          </button>
        </div>
      </div>
    );
  }

  const displayName = userName || '游民';

  return (
    <>
      {/* 手机端头像按钮 */}
      <button
        type="button"
        aria-label={profileOpen ? '收起个人面板' : '展开个人面板'}
        onClick={() => setProfileOpen((prev) => !prev)}
        className="absolute right-3 z-[1000] flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/70 bg-white/95 text-sm font-semibold text-[#6F8B73] shadow-sm backdrop-blur-sm mobile-safe-top [--safe-top-base:0.75rem] md:hidden"
      >
        {avatar ? (
          <img src={avatar} alt={displayName} className="h-full w-full object-cover" />
        ) : (
          displayName.slice(0, 1).toUpperCase()
        )}
      </button>

      {/* 桌面端 & 展开 个人面板 */}
      <div
        className={`absolute right-3 z-[1000] rounded-xl border border-white/25 bg-white/55 p-3 shadow-sm backdrop-blur-md transition-all duration-200 mobile-safe-top [--safe-top-base:3.85rem] md:right-4 md:top-4 md:[--safe-top-base:1rem] ${profileOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none md:opacity-100 md:translate-y-0 md:pointer-events-auto'}`}
      >
        {editOpen ? (
          <div className="space-y-3 w-52">
            <h4 className="text-sm font-semibold text-slate-700">编辑资料</h4>

            {/* 头像上传 */}
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-dashed border-gray-300 hover:border-[#7E9D82] transition-colors"
              >
                {(editAvatarPreview || avatar) ? (
                  <img
                    src={editAvatarPreview || avatar || ''}
                    alt="头像预览"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-2xl text-gray-400">
                    {displayName.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
                className="hidden"
              />
              <span className="text-[10px] text-gray-400">点击更换头像</span>
            </div>

            {/* 用户名编辑 */}
            <input
              type="text"
              placeholder="用户名（2-20位）"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {editError && <div className="text-red-500 text-xs">{editError}</div>}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  void handleSaveProfile();
                }}
                disabled={editSaving}
                className="flex-1 bg-[#7E9D82] hover:bg-[#6F8B73] text-white px-3 py-2 rounded text-xs disabled:opacity-50"
              >
                {editSaving ? '保存中...' : '保存'}
              </button>
              <button
                onClick={() => setEditOpen(false)}
                disabled={editSaving}
                className="flex-1 border border-gray-300 text-gray-600 px-3 py-2 rounded text-xs hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={openEdit}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#7E9D82] text-sm font-semibold text-white">
                {avatar ? (
                  <img src={avatar} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  displayName.slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="text-sm text-slate-700 text-left">
                <p className="font-semibold">{displayName}</p>
                <p className="text-[10px] text-gray-400">点击编辑资料</p>
              </div>
            </button>
            <button
              onClick={handleLogout}
              className="w-full bg-[#7E9D82] hover:bg-[#6F8B73] text-white px-3 py-2 rounded text-sm"
            >
              退出登录
            </button>
          </div>
        )}
      </div>
    </>
  );
}
