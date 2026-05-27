'use client';

import { useRef, useState } from 'react';
import { getEmailRuleError } from '@/lib/auth/authRules';

type LoginPanelProps = {
  apiBaseUrl: string;
  isLoggedIn: boolean;
  userName: string | null;
  avatar: string | null;
  onLoginSuccess: (userId: string, userName: string, avatar?: string, isAdmin?: boolean) => void;
  onLogout: () => void;
  sendCode: (apiBaseUrl: string, email: string) => Promise<{ ok: boolean; error?: string }>;
  register: (apiBaseUrl: string, email: string, password: string, code: string) => Promise<
    | { ok: true; userId: string; userName: string; avatar?: string; isAdmin?: boolean }
    | { ok: false; error: string }
  >;
  login: (apiBaseUrl: string, email: string, password: string) => Promise<
    | { ok: true; userId: string; userName: string; avatar?: string; isAdmin?: boolean }
    | { ok: false; error: string }
  >;
  resetPassword: (apiBaseUrl: string, email: string, code: string, newPassword: string) => Promise<
    | { ok: true } | { ok: false; error: string }
  >;
  updateProfile: (apiBaseUrl: string, updates: { userName?: string; avatar?: string }) => Promise<
    | { ok: true; userName: string; avatar?: string } | { ok: false; error: string }
  >;
  deleteAccount: (apiBaseUrl: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  changePassword: (apiBaseUrl: string, oldPassword: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>;
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
      const scale = Math.min(AVATAR_SIZE / img.naturalWidth, AVATAR_SIZE / img.naturalHeight);
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('压缩失败')); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片读取失败')); };
    img.src = url;
  });
};

export default function LoginPanel({
  apiBaseUrl, isLoggedIn, userName, avatar,
  onLoginSuccess, onLogout, sendCode, register, login, resetPassword, updateProfile, deleteAccount, changePassword,
}: LoginPanelProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 个人编辑
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [donateOpen, setDonateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  // 修改密码
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSendCode = async () => {
    setSendingCode(true);
    setErrorMsg('');
    try {
      const result = await sendCode(apiBaseUrl, email);
      if (!result.ok) { setErrorMsg(result.error || '发送失败'); return; }
      setCodeSent(true);
      setErrorMsg('');
    } finally {
      setSendingCode(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true); setErrorMsg('');
    try {
      const result = await login(apiBaseUrl, email, password);
      if (!result.ok) { setErrorMsg(result.error); return; }
      onLoginSuccess(result.userId, result.userName, result.avatar, result.isAdmin);
      resetForm();
    } finally { setLoading(false); }
  };

  const handleRegister = async () => {
    setLoading(true); setErrorMsg('');
    try {
      const result = await register(apiBaseUrl, email, password, code);
      if (!result.ok) { setErrorMsg(result.error); return; }
      onLoginSuccess(result.userId, result.userName, result.avatar, result.isAdmin);
      resetForm();
    } finally { setLoading(false); }
  };

  const handleResetPassword = async () => {
    setLoading(true); setErrorMsg('');
    try {
      const result = await resetPassword(apiBaseUrl, email, code, password);
      if (!result.ok) { setErrorMsg(result.error); return; }
      setErrorMsg('密码重置成功，请登录');
      setMode('login');
      setPassword(''); setCode(''); setCodeSent(false);
    } finally { setLoading(false); }
  };

  const resetForm = () => { setEmail(''); setPassword(''); setCode(''); setCodeSent(false); setErrorMsg(''); };
  const switchMode = (m: 'login' | 'register' | 'forgot') => { setMode(m); setErrorMsg(''); setCode(''); setCodeSent(false); };

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) { onLogout(); setEditOpen(false); }
  };

  const openEdit = () => {
    setEditName(userName || ''); setEditAvatarFile(null); setEditAvatarPreview(null); setEditError(''); setEditOpen(true);
  };
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setEditAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => { setEditAvatarPreview(typeof reader.result === 'string' ? reader.result : null); };
    reader.readAsDataURL(file);
  };
  const handleSaveProfile = async () => {
    const trimmed = editName.trim();
    if (!trimmed) { setEditError('用户名不能为空'); return; }
    if (trimmed.length < 2 || trimmed.length > 20) { setEditError('用户名需为 2-20 位'); return; }
    setEditSaving(true); setEditError('');
    try {
      let avatarBase64: string | undefined;
      if (editAvatarFile) {
        try { avatarBase64 = await compressAvatar(editAvatarFile); }
        catch (err) { setEditError(err instanceof Error ? err.message : '头像压缩失败'); setEditSaving(false); return; }
      }
      const updates: { userName?: string; avatar?: string } = {};
      if (trimmed !== userName) updates.userName = trimmed;
      if (avatarBase64 !== undefined) updates.avatar = avatarBase64;
      if (Object.keys(updates).length === 0) { setEditOpen(false); setEditSaving(false); return; }
      const result = await updateProfile(apiBaseUrl, updates);
      if (!result.ok) { setEditError(result.error); return; }
      setEditOpen(false);
    } catch { setEditError('网络错误'); }
    finally { setEditSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) { setPasswordError('请填写旧密码和新密码'); return; }
    setPasswordSaving(true); setPasswordError(''); setPasswordSuccess(false);
    try {
      const result = await changePassword(apiBaseUrl, oldPassword, newPassword);
      if (!result.ok) { setPasswordError(result.error || '修改失败'); return; }
      setPasswordSuccess(true);
      setOldPassword(''); setNewPassword('');
    } catch { setPasswordError('网络错误'); }
    finally { setPasswordSaving(false); }
  };

  const handleDeleteAccount = async () => {
    setDeleteSubmitting(true); setDeleteError('');
    try {
      const result = await deleteAccount(apiBaseUrl, deletePassword);
      if (!result.ok) { setDeleteError(result.error || '注销失败'); return; }
      setDeleteOpen(false); onLogout();
    } catch { setDeleteError('网络错误'); }
    finally { setDeleteSubmitting(false); }
  };

  // 登录面板
  if (!isLoggedIn) {
    const isForgot = mode === 'forgot';
    const isRegister = mode === 'register';
    const canAuth = email.trim() !== '' && password.trim() !== '' && (isRegister ? code.trim() !== '' : true) && !loading;

    return (
      <div className="absolute left-1/2 top-1/2 z-[1000] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-4 shadow-lg">
        <div className="w-72 space-y-3">
          {/* 标签切换 */}
          <div className="flex border-b border-gray-200">
            {(['login', 'register'] as const).map((m) => (
              <button key={m} onClick={() => switchMode(m)}
                className={`flex-1 pb-2 text-sm font-medium transition-colors ${mode === m ? 'text-[#6F8B73] border-b-2 border-[#6F8B73]' : 'text-gray-400'}`}>
                {m === 'login' ? '登录' : '注册'}
              </button>
            ))}
          </div>

          {/* 邮箱 */}
          <input type="email" placeholder="邮箱" value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); isForgot ? null : isRegister ? handleRegister() : handleLogin(); }}}
            className="w-full border border-gray-300 rounded px-3 py-2 text-xs placeholder:text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {email && getEmailRuleError(email) && (
            <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] text-amber-700">仅支持：gmail.com、163.com、126.com、qq.com</div>
          )}

          {/* 注册/忘记密码 - 验证码 */}
          {(isRegister || isForgot) && (
            <div className="flex gap-2">
              <input type="text" placeholder="验证码" value={code} maxLength={6}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-xs placeholder:text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={() => { void handleSendCode(); }}
                disabled={sendingCode || !email || !!getEmailRuleError(email)}
                className="shrink-0 bg-[#7E9D82] hover:bg-[#6F8B73] disabled:bg-gray-300 text-white px-3 py-2 rounded text-xs">
                {sendingCode ? '发送中...' : codeSent ? '重新发送' : '发送验证码'}
              </button>
            </div>
          )}

          {/* 密码 */}
          {!isForgot && (
            <input type="password" placeholder={isRegister ? '设置密码（8-16位，含字母数字符号）' : '密码'} value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); isRegister ? handleRegister() : handleLogin(); }}}
              className="w-full border border-gray-300 rounded px-3 py-2 text-xs placeholder:text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
          )}

          {/* 忘记密码 - 新密码 */}
          {isForgot && (
            <input type="password" placeholder="新密码（8-16位，含字母数字符号）" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-xs placeholder:text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
          )}

          {errorMsg && <div className={`text-xs ${errorMsg.includes('成功') ? 'text-green-600' : 'text-red-500'}`}>{errorMsg}</div>}

          {/* 按钮 */}
          {mode === 'login' && (
            <button onClick={() => { void handleLogin(); }} disabled={!canAuth}
              className="w-full bg-[#7E9D82] hover:bg-[#6F8B73] text-white px-3 py-2 rounded text-sm disabled:opacity-50">
              {loading ? '请稍候...' : '登录'}
            </button>
          )}
          {mode === 'register' && (
            <button onClick={() => { void handleRegister(); }} disabled={!canAuth}
              className="w-full bg-[#7E9D82] hover:bg-[#6F8B73] text-white px-3 py-2 rounded text-sm disabled:opacity-50">
              {loading ? '请稍候...' : '注册'}
            </button>
          )}
          {mode === 'forgot' && (
            <>
              <button onClick={() => { void handleResetPassword(); }} disabled={!canAuth}
                className="w-full bg-[#7E9D82] hover:bg-[#6F8B73] text-white px-3 py-2 rounded text-sm disabled:opacity-50">
                {loading ? '请稍候...' : '重置密码'}
              </button>
              <button onClick={() => switchMode('login')}
                className="w-full text-xs text-gray-400 hover:text-gray-600">返回登录</button>
            </>
          )}

          {/* 忘记密码链接 */}
          {mode === 'login' && (
            <button onClick={() => switchMode('forgot')}
              className="w-full text-xs text-gray-400 hover:text-[#6F8B73]">
              忘记密码？
            </button>
          )}
        </div>
      </div>
    );
  }

  // 已登录 - 头像和个人面板
  const displayName = userName || '游民';
  return (
    <>
      <div className="absolute right-3 z-[1000] flex flex-col items-center gap-1 mobile-safe-top [--safe-top-base:0.75rem] md:right-4 md:top-4">
        <button type="button" onClick={openEdit}
          className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/70 bg-white/95 shadow-sm backdrop-blur-sm">
          {avatar ? <img src={avatar} alt={displayName} className="h-full w-full object-cover" />
            : <span className="text-sm font-semibold text-[#6F8B73]">{displayName.slice(0, 1).toUpperCase()}</span>}
        </button>
        <button type="button" onClick={() => setDonateOpen(true)}
          className="rounded-full bg-white/85 px-2 py-0.5 text-[10px] text-amber-500 shadow-sm backdrop-blur-sm hover:bg-white transition-colors">
          赞赏
        </button>
      </div>

      {editOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/30">
          <div className="rounded-xl bg-white p-5 shadow-2xl w-72 mx-4 space-y-4">
            <h3 className="text-base font-bold text-slate-800 text-center">编辑资料</h3>
            <div className="flex flex-col items-center gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-dashed border-gray-300 hover:border-[#7E9D82] transition-colors">
                {(editAvatarPreview || avatar) ? <img src={editAvatarPreview || avatar || ''} alt="头像预览" className="h-full w-full object-cover" />
                  : <span className="flex h-full w-full items-center justify-center text-3xl text-gray-400">{displayName.slice(0, 1).toUpperCase()}</span>}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarFileChange} className="hidden" />
              <span className="text-[11px] text-gray-400">点击头像更换</span>
            </div>
            <input type="text" placeholder="用户名（2-20位）" value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {editError && <div className="text-red-500 text-xs text-center">{editError}</div>}
            <div className="flex gap-2">
              <button onClick={() => { void handleSaveProfile(); }} disabled={editSaving}
                className="flex-1 bg-[#7E9D82] hover:bg-[#6F8B73] text-white px-3 py-2 rounded text-sm disabled:opacity-50">
                {editSaving ? '保存中...' : '保存'}
              </button>
              <button onClick={() => setEditOpen(false)} disabled={editSaving}
                className="flex-1 border border-gray-300 text-gray-600 px-3 py-2 rounded text-sm hover:bg-gray-50">取消</button>
            </div>
            <button onClick={() => { setPasswordOpen(true); setOldPassword(''); setNewPassword(''); setPasswordError(''); setPasswordSuccess(false); }}
              className="w-full text-xs text-blue-500 hover:text-blue-700 transition-colors">修改密码</button>
            <button onClick={() => { setDeleteOpen(true); setDeletePassword(''); setDeleteError(''); }}
              className="w-full text-xs text-red-400 hover:text-red-600 transition-colors">注销账户</button>
            <button onClick={handleLogout}
              className="w-full text-xs text-gray-400 hover:text-red-500 transition-colors">退出登录</button>
          </div>
        </div>
      )}

      {/* 赞赏弹窗 */}
      {donateOpen && (
        <div className="fixed inset-0 z-[2001] flex items-center justify-center bg-black/40" onClick={() => setDonateOpen(false)}>
          <div className="rounded-xl bg-white p-5 shadow-2xl w-72 mx-4 space-y-4 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-800">赞赏作者</h3>
            <p className="text-sm text-slate-500">感谢你的支持！请作者喝杯咖啡</p>
            <div className="flex justify-center gap-4">
              <a href="/wechat-qr.jpg" download="微信赞赏码.jpg" className="space-y-1 no-underline">
                <img src="/wechat-qr.jpg" alt="微信赞赏码" className="h-36 w-36 rounded-xl object-cover shadow-sm" />
                <span className="text-[11px] text-slate-400 block text-center">保存微信码</span>
              </a>
              <a href="/alipay-qr.jpg" download="支付宝收款码.jpg" className="space-y-1 no-underline">
                <img src="/alipay-qr.jpg" alt="支付宝收款码" className="h-36 w-36 rounded-xl object-cover shadow-sm" />
                <span className="text-[11px] text-slate-400 block text-center">保存支付宝码</span>
              </a>
            </div>
            <p className="text-[10px] text-slate-400 text-center">（微信码需保存后扫一扫，支付宝可直接跳转）</p>
            <button onClick={() => setDonateOpen(false)}
              className="text-xs text-gray-400 hover:text-gray-600">关闭</button>
          </div>
        </div>
      )}
      {/* 修改密码弹窗 */}
      {passwordOpen && (
        <div className="fixed inset-0 z-[2002] flex items-center justify-center bg-black/40" onClick={() => setPasswordOpen(false)}>
          <div className="rounded-xl bg-white p-5 shadow-2xl w-72 mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-800 text-center">修改密码</h3>
            {passwordSuccess ? (
              <>
                <p className="text-sm text-green-600 text-center">密码修改成功！</p>
                <button onClick={() => setPasswordOpen(false)}
                  className="w-full bg-[#7E9D82] hover:bg-[#6F8B73] text-white px-3 py-2 rounded text-sm">关闭</button>
              </>
            ) : (
              <>
                <input type="password" placeholder="旧密码" value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="password" placeholder="新密码（8-16位，含字母数字符号）" value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {passwordError && <div className="text-red-500 text-xs text-center">{passwordError}</div>}
                <div className="flex gap-2">
                  <button onClick={() => { void handleChangePassword(); }} disabled={passwordSaving || !oldPassword || !newPassword}
                    className="flex-1 bg-[#7E9D82] hover:bg-[#6F8B73] text-white px-3 py-2 rounded text-sm disabled:opacity-50">
                    {passwordSaving ? '修改中...' : '确认修改'}
                  </button>
                  <button onClick={() => setPasswordOpen(false)} disabled={passwordSaving}
                    className="flex-1 border border-gray-300 text-gray-600 px-3 py-2 rounded text-sm hover:bg-gray-50">取消</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* 注销确认弹窗 */}
      {deleteOpen && (
        <div className="fixed inset-0 z-[2002] flex items-center justify-center bg-black/40" onClick={() => setDeleteOpen(false)}>
          <div className="rounded-xl bg-white p-5 shadow-2xl w-72 mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-red-500 text-center">注销账户</h3>
            <p className="text-sm text-slate-500 text-center">此操作不可撤销，将删除所有足迹和聊天记录</p>
            <input type="password" placeholder="输入密码确认" value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            {deleteError && <div className="text-red-500 text-xs text-center">{deleteError}</div>}
            <div className="flex gap-2">
              <button onClick={() => { void handleDeleteAccount(); }} disabled={deleteSubmitting || !deletePassword}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm disabled:opacity-50">
                {deleteSubmitting ? '注销中...' : '确认注销'}
              </button>
              <button onClick={() => setDeleteOpen(false)} disabled={deleteSubmitting}
                className="flex-1 border border-gray-300 text-gray-600 px-3 py-2 rounded text-sm hover:bg-gray-50">取消</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
