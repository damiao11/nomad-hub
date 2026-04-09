'use client';

type NoticeDialogProps = {
  open: boolean;
  message: string | null;
  copyValue: string | null;
  onCopyValue: (value: string) => void;
  onClose: () => void;
};

export default function NoticeDialog({
  open,
  message,
  copyValue,
  onCopyValue,
  onClose,
}: NoticeDialogProps) {
  if (!open || !message) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-5 z-[1300] flex justify-center px-3">
      <div className="pointer-events-auto flex w-auto max-w-[92vw] items-center gap-2 rounded-full bg-[#6F8B73]/95 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-sm">
        <span className="truncate">{message}</span>
        {copyValue && (
          <button
            onClick={() => onCopyValue(copyValue)}
            className="rounded-full border border-white/55 px-2 py-0.5 text-xs text-white hover:bg-white/15"
          >
            复制
          </button>
        )}
      </div>
    </div>
  );
}
