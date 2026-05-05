import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';

type UseGroupInviteParams = {
  socket: Socket;
  isLoggedIn: boolean;
  userId: string | null;
  userName: string | null;
  avatar: string | null;
  groupCode: string | null;
  setGroupCode: (value: string | null) => void;
  showNotice: (message: string, copyValue?: string | null) => void;
  copyTextToClipboard: (value: string) => Promise<boolean>;
  onLeaveGroupCleanup: () => void;
};

export function useGroupInvite({
  socket,
  isLoggedIn,
  userId,
  userName,
  avatar,
  groupCode,
  setGroupCode,
  showNotice,
  copyTextToClipboard,
  onLeaveGroupCleanup,
}: UseGroupInviteParams) {
  const [groupPanelOpen, setGroupPanelOpen] = useState(false);
  const [joinGroupDialogOpen, setJoinGroupDialogOpen] = useState(false);
  const [groupCodeInput, setGroupCodeInput] = useState('');
  const [copyHintMessage, setCopyHintMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!copyHintMessage) return;
    const timer = setTimeout(() => setCopyHintMessage(null), 1800);
    return () => clearTimeout(timer);
  }, [copyHintMessage]);

  const ensureSocketReady = async () => {
    if (socket.connected) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      let settled = false;

      const cleanup = () => {
        socket.off('connect', handleConnect);
        socket.off('connect_error', handleConnectError);
      };

      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(ok);
      };

      const handleConnect = () => {
        finish(true);
      };

      const handleConnectError = (error: unknown) => {
        console.warn('Socket 连接失败:', error);
        finish(false);
      };

      socket.once('connect', handleConnect);
      socket.once('connect_error', handleConnectError);
      socket.connect();

      window.setTimeout(() => finish(socket.connected), 5000);
    });
  };

  const waitForGroupJoined = (emitAction: () => void) => {
    return new Promise<{ ok: boolean; code?: string; error?: string }>((resolve) => {
      let settled = false;

      const finish = (result: { ok: boolean; code?: string; error?: string }) => {
        if (settled) return;
        settled = true;
        socket.off('group-joined', handleJoined);
        resolve(result);
      };

      const handleJoined = (payload: { code?: string }) => {
        if (payload?.code) {
          finish({ ok: true, code: payload.code });
        }
      };

      socket.once('group-joined', handleJoined);
      emitAction();
      window.setTimeout(() => finish({ ok: false, error: '群组操作超时，请重试' }), 5000);
    });
  };

  const createGroup = async () => {
    if (!isLoggedIn) {
      showNotice('请先登录');
      return;
    }

    const ready = await ensureSocketReady();
    if (!ready) {
      showNotice('实时服务连接失败，请检查后端');
      return;
    }

    const result = await waitForGroupJoined(() => {
      socket.emit('create-group', { userId, userName: userName || '匿名游民', avatar: avatar || '' });
    });

    if (!result.ok || !result.code) {
      showNotice(result.error || '创建群组失败');
      return;
    }

    setGroupCode(result.code);
    localStorage.setItem('groupCode', result.code);
    setGroupPanelOpen(false);
    showNotice(`已创建群组：${result.code}`, result.code);
  };

  const joinGroupByCode = async () => {
    if (!isLoggedIn) {
      showNotice('请先登录');
      return;
    }

    const code = groupCodeInput.trim().toUpperCase();
    if (!code) {
      showNotice('请输入邀请码');
      return;
    }

    const ready = await ensureSocketReady();
    if (!ready) {
      showNotice('实时服务连接失败，请检查后端');
      return;
    }

    const result = await waitForGroupJoined(() => {
      socket.emit('join-group', { code, userId, userName: userName || '匿名游民', avatar: avatar || '' });
    });

    if (!result.ok || !result.code) {
      showNotice(result.error || '加入群组失败');
      return;
    }

    setGroupCode(result.code);
    localStorage.setItem('groupCode', result.code);
    setGroupPanelOpen(false);
    setJoinGroupDialogOpen(false);
    setGroupCodeInput('');
    showNotice(`已加入群组：${result.code}`, result.code);
  };

  const leaveGroup = () => {
    socket.emit('leave-group', {}, () => {
      setGroupCode(null);
      setGroupCodeInput('');
      onLeaveGroupCleanup();
      localStorage.removeItem('groupCode');
      showNotice('已退出群组');
    });
  };

  const copyGroupCode = async () => {
    if (!groupCode) {
      setCopyHintMessage('当前没有可复制的邀请码');
      return;
    }

    const copied = await copyTextToClipboard(groupCode);
    if (copied) {
      setCopyHintMessage('邀请码已复制');
    } else {
      setCopyHintMessage('复制失败，请手动复制邀请码');
    }
  };

  return {
    groupPanelOpen,
    setGroupPanelOpen,
    joinGroupDialogOpen,
    setJoinGroupDialogOpen,
    groupCodeInput,
    setGroupCodeInput,
    copyHintMessage,
    setCopyHintMessage,
    createGroup,
    joinGroupByCode,
    leaveGroup,
    copyGroupCode,
  };
}
