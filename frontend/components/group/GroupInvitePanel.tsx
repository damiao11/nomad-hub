'use client';

type GroupInvitePanelProps = {
  open: boolean;
  groupCode: string | null;
  groupCodeInput: string;
  joinDialogOpen: boolean;
  copyHintMessage: string | null;
  onClosePanel: () => void;
  onCopyCode: () => void;
  onOpenChat: () => void;
  onCreateGroup: () => void;
  onLeaveGroup: () => void;
  onOpenJoinDialog: () => void;
  onCloseJoinDialog: () => void;
  onGroupCodeInputChange: (value: string) => void;
  onJoinGroup: () => void;
};

export default function GroupInvitePanel({
  open,
  groupCode,
  groupCodeInput,
  joinDialogOpen,
  copyHintMessage,
  onClosePanel,
  onCopyCode,
  onOpenChat,
  onCreateGroup,
  onLeaveGroup,
  onOpenJoinDialog,
  onCloseJoinDialog,
  onGroupCodeInputChange,
  onJoinGroup,
}: GroupInvitePanelProps) {
  return (
    <>
      {open && copyHintMessage && (
        <div className="absolute bottom-[398px] right-20 z-[1250] rounded-md border border-white/35 bg-[#7E9D82]/72 px-3 py-1 text-xs text-white shadow-[0_8px_24px_rgba(111,139,115,0.35)] backdrop-blur-md">
          {copyHintMessage}
        </div>
      )}

      {open && (
        <div className="absolute bottom-20 right-20 z-[1200] w-[320px] space-y-3 rounded-xl border border-white/60 bg-white/95 p-3 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">群组邀请码</div>
            <button onClick={onClosePanel} className="text-slate-500 hover:text-slate-700">×</button>
          </div>

          {groupCode ? (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-2">
                <div>
                  当前群组：<span className="font-semibold tracking-wide text-[#6F8B73]">{groupCode}</span>
                </div>
                <button
                  onClick={onCopyCode}
                  className="rounded border border-[#7E9D82] px-2 py-1 text-xs text-[#6F8B73] hover:bg-[#ECF4ED]"
                >
                  复制邀请码
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              你还没有加入群组，可创建或输入邀请码加入。
            </div>
          )}

          {groupCode && (
            <button
              onClick={onOpenChat}
              className="w-full rounded bg-[#7E9D82] px-3 py-2 text-sm text-white hover:bg-[#6F8B73]"
            >
              打开群组聊天
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={onCreateGroup}
              className="flex-1 rounded bg-[#7E9D82] px-3 py-2 text-sm text-white hover:bg-[#6F8B73]"
            >
              创建群组
            </button>
            {groupCode && (
              <button
                onClick={onLeaveGroup}
                className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                退出
              </button>
            )}
          </div>

          <div className="space-y-2">
            <button
              onClick={onOpenJoinDialog}
              className="w-full rounded border border-[#7E9D82] px-3 py-2 text-sm text-[#6F8B73] hover:bg-[#ECF4ED]"
            >
              加入群组
            </button>
          </div>
        </div>
      )}

      {joinDialogOpen && (
        <div className="absolute inset-0 z-[1260] flex items-center justify-center bg-black/22 p-4">
          <div className="w-full max-w-sm rounded-xl border border-white/55 bg-white/90 p-4 shadow-2xl backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-800">输入邀请码</div>
              <button onClick={onCloseJoinDialog} className="text-slate-500 hover:text-slate-700">×</button>
            </div>
            <input
              type="text"
              value={groupCodeInput}
              onChange={(e) => onGroupCodeInputChange(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onJoinGroup();
                }
              }}
              placeholder="例如 A3K9QZ"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm uppercase tracking-wider outline-none focus:ring-2 focus:ring-[#7E9D82]"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={onCloseJoinDialog}
                className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={onJoinGroup}
                className="flex-1 rounded bg-[#7E9D82] px-3 py-2 text-sm text-white hover:bg-[#6F8B73]"
              >
                确认加入
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
