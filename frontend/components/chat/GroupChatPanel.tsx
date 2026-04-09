'use client';

import type { RefObject } from 'react';

type GroupChatMessage = {
  id: string;
  userName: string;
  text: string;
  createdAt: string;
};

type GroupChatPanelProps = {
  open: boolean;
  groupCode: string | null;
  userName: string | null;
  chatMessages: GroupChatMessage[];
  chatInput: string;
  chatSending: boolean;
  chatHasMore: boolean;
  chatLoadingMore: boolean;
  chatListRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onChatInputChange: (value: string) => void;
  onSend: () => void;
  onLoadMore: () => void;
};

export default function GroupChatPanel({
  open,
  groupCode,
  userName,
  chatMessages,
  chatInput,
  chatSending,
  chatHasMore,
  chatLoadingMore,
  chatListRef,
  onClose,
  onChatInputChange,
  onSend,
  onLoadMore,
}: GroupChatPanelProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="absolute bottom-20 right-20 z-[1200] flex h-[340px] w-[320px] flex-col overflow-hidden rounded-xl border border-white/60 bg-white/95 shadow-2xl backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <div className="text-sm font-semibold text-slate-800">群组实时聊天 {groupCode ? `(${groupCode})` : ''}</div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-700">×</button>
      </div>

      <div
        ref={chatListRef}
        onScroll={(e) => {
          if (e.currentTarget.scrollTop <= 18) {
            onLoadMore();
          }
        }}
        className="flex-1 space-y-2 overflow-y-auto px-3 py-2"
      >
        {chatHasMore && !chatLoadingMore && chatMessages.length > 0 && (
          <div className="text-center text-[11px] text-slate-500">上滑加载更多历史消息</div>
        )}
        {chatLoadingMore && (
          <div className="text-center text-[11px] text-slate-500">加载更多消息中...</div>
        )}
        {chatMessages.length === 0 && (
          <div className="rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-500">暂无消息，发一条打个招呼吧</div>
        )}
        {chatMessages.map((msg) => {
          const mine = msg.userName === (userName || '');
          return (
            <div key={msg.id} className={`max-w-[86%] rounded-lg px-2.5 py-1.5 text-sm ${mine ? 'ml-auto bg-[#7E9D82] text-white' : 'bg-slate-100 text-slate-700'}`}>
              <div className={`text-[10px] ${mine ? 'text-white/80' : 'text-slate-500'}`}>{msg.userName}</div>
              <div>{msg.text}</div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 border-t border-slate-200 p-2">
        <input
          type="text"
          value={chatInput}
          onChange={(e) => onChatInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="输入消息..."
          className="flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#7E9D82]"
        />
        <button
          onClick={onSend}
          disabled={chatSending}
          className="rounded bg-[#7E9D82] px-3 py-1.5 text-sm text-white hover:bg-[#6F8B73] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {chatSending ? '发送中...' : '发送'}
        </button>
      </div>
    </div>
  );
}
