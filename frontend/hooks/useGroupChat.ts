import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

export type GroupChatMessage = {
  id: string;
  userName: string;
  text: string;
  createdAt: string;
};

type UseGroupChatParams = {
  socket: Socket;
  isLoggedIn: boolean;
  groupCode: string | null;
  userId: string | null;
  userName: string | null;
  showNotice: (message: string) => void;
  onKicked: () => void;
};

const CHAT_HISTORY_PAGE_SIZE = 30;

export function useGroupChat({
  socket,
  isLoggedIn,
  groupCode,
  userId,
  userName,
  showNotice,
  onKicked,
}: UseGroupChatParams) {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<GroupChatMessage[]>([]);
  const [chatHasMore, setChatHasMore] = useState(false);
  const [chatLoadingMore, setChatLoadingMore] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const [chatSending, setChatSending] = useState(false);
  const chatOpenRef = useRef(false);
  const chatListRef = useRef<HTMLDivElement | null>(null);
  const chatLoadingMoreRef = useRef(false);

  const resetChatState = () => {
    setChatOpen(false);
    setChatInput('');
    setChatMessages([]);
    setChatHasMore(false);
    setChatLoadingMore(false);
    chatLoadingMoreRef.current = false;
    setChatUnread(0);
  };

  const requestGroupHistoryPage = async (offset: number, limit = CHAT_HISTORY_PAGE_SIZE) => {
    return new Promise<{ ok: boolean; messages: GroupChatMessage[]; hasMore: boolean }>((resolve) => {
      let settled = false;

      const finish = (result: { ok: boolean; messages: GroupChatMessage[]; hasMore: boolean }) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };

      socket.emit(
        'request-group-history',
        { offset, limit },
        (ack?: { ok?: boolean; messages?: GroupChatMessage[]; hasMore?: boolean }) => {
          if (ack?.ok === false) {
            finish({ ok: false, messages: [], hasMore: false });
            return;
          }

          finish({
            ok: true,
            messages: Array.isArray(ack?.messages) ? ack.messages : [],
            hasMore: Boolean(ack?.hasMore),
          });
        }
      );

      window.setTimeout(() => {
        finish({ ok: false, messages: [], hasMore: false });
      }, 5000);
    });
  };

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

  const loadOlderChatMessages = async () => {
    if (!groupCode || !chatHasMore || chatLoadingMoreRef.current) {
      return;
    }

    const list = chatListRef.current;
    const previousScrollHeight = list?.scrollHeight ?? 0;
    chatLoadingMoreRef.current = true;
    setChatLoadingMore(true);

    try {
      const result = await requestGroupHistoryPage(chatMessages.length, CHAT_HISTORY_PAGE_SIZE);
      if (!result.ok) {
        return;
      }

      setChatHasMore(result.hasMore);
      setChatMessages((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const olderMessages = result.messages.filter((item) => !existingIds.has(item.id));
        return [...olderMessages, ...prev];
      });

      window.requestAnimationFrame(() => {
        if (!list) return;
        const nextScrollHeight = list.scrollHeight;
        list.scrollTop = Math.max(0, nextScrollHeight - previousScrollHeight);
      });
    } finally {
      chatLoadingMoreRef.current = false;
      setChatLoadingMore(false);
    }
  };

  const sendGroupMessage = async () => {
    if (!isLoggedIn || !groupCode) {
      return;
    }

    const text = chatInput.trim();
    if (!text || chatSending) {
      return;
    }

    const ready = await ensureSocketReady();
    if (!ready) {
      showNotice('实时服务连接失败，请稍后重试');
      return;
    }

    setChatSending(true);
    try {
      const result = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
        let settled = false;

        const finish = (payload: { ok: boolean; error?: string }) => {
          if (settled) return;
          settled = true;
          resolve(payload);
        };

        socket.emit(
          'group-message',
          {
            userName: userName || '匿名游民',
            text,
          },
          (ack?: { ok?: boolean; error?: string }) => {
            if (ack?.ok) {
              finish({ ok: true });
              return;
            }
            finish({ ok: false, error: ack?.error || '消息发送失败，请重试' });
          }
        );

        window.setTimeout(() => finish({ ok: false, error: '消息发送超时，请重试' }), 5000);
      });

      if (result.ok) {
        setChatInput('');
      } else {
        showNotice(result.error || '消息发送失败，请重试');
      }
    } finally {
      setChatSending(false);
    }
  };

  useEffect(() => {
    chatOpenRef.current = chatOpen;
    if (chatOpen) {
      setChatUnread(0);
    }
  }, [chatOpen]);

  useEffect(() => {
    if (!isLoggedIn || !groupCode) {
      setChatMessages([]);
      setChatHasMore(false);
      setChatLoadingMore(false);
      chatLoadingMoreRef.current = false;
      setChatUnread(0);
      return;
    }

    let cancelled = false;

    const loadLatestHistory = async () => {
      const result = await requestGroupHistoryPage(0, CHAT_HISTORY_PAGE_SIZE);
      if (cancelled) return;

      if (!result.ok) {
        setChatMessages([]);
        setChatHasMore(false);
        return;
      }

      setChatMessages(result.messages);
      setChatHasMore(result.hasMore);
      window.requestAnimationFrame(() => {
        const list = chatListRef.current;
        if (list) {
          list.scrollTop = list.scrollHeight;
        }
      });
    };

    const handleMessage = (message: GroupChatMessage) => {
      setChatMessages((prev) => {
        const next = [...prev, message];
        return next.length > 240 ? next.slice(next.length - 240) : next;
      });
      if (chatOpenRef.current) {
        window.requestAnimationFrame(() => {
          const list = chatListRef.current;
          if (list) {
            list.scrollTop = list.scrollHeight;
          }
        });
      }
      if (!chatOpenRef.current) {
        setChatUnread((prev) => prev + 1);
      }
    };

    const handleGroupError = (payload: { message?: string }) => {
      if (payload?.message) {
        showNotice(payload.message);
      }
    };

    const handleKicked = (payload: { reason?: string }) => {
      resetChatState();
      localStorage.removeItem('groupCode');
      onKicked();
      showNotice(payload?.reason || '你已被移出群组');
    };

    socket.on('group-message', handleMessage);
    socket.on('group-error', handleGroupError);
    socket.on('kicked', handleKicked);
    socket.emit('join-group', { code: groupCode, userId, userName: userName || '匿名游民' });
    void loadLatestHistory();

    return () => {
      cancelled = true;
      socket.off('group-message', handleMessage);
      socket.off('group-error', handleGroupError);
      socket.off('kicked', handleKicked);
    };
  }, [isLoggedIn, groupCode, userId, userName]);

  useEffect(() => {
    if (!isLoggedIn || !groupCode || !userId) {
      return;
    }

    const handleReconnect = async () => {
      socket.emit('join-group', { code: groupCode, userId, userName: userName || '匿名游民' });
      const result = await requestGroupHistoryPage(0, CHAT_HISTORY_PAGE_SIZE);
      if (!result.ok) return;
      setChatMessages(result.messages);
      setChatHasMore(result.hasMore);
      window.requestAnimationFrame(() => {
        const list = chatListRef.current;
        if (list) {
          list.scrollTop = list.scrollHeight;
        }
      });
    };

    socket.on('connect', handleReconnect);
    return () => {
      socket.off('connect', handleReconnect);
    };
  }, [isLoggedIn, groupCode, userId, userName]);

  return {
    chatOpen,
    setChatOpen,
    chatInput,
    setChatInput,
    chatMessages,
    chatHasMore,
    chatLoadingMore,
    chatUnread,
    chatSending,
    chatListRef,
    loadOlderChatMessages,
    sendGroupMessage,
    resetChatState,
  };
}
