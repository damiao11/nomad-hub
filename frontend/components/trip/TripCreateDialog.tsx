'use client';

type TripCreateDialogProps = {
  open: boolean;
  tripName: string;
  tripNote: string;
  tripFiles: File[];
  tripSaving: boolean;
  onClose: () => void;
  onTripNameChange: (value: string) => void;
  onTripNoteChange: (value: string) => void;
  onTripFilesChange: (files: File[]) => void;
  onSubmit: () => void;
};

export default function TripCreateDialog({
  open,
  tripName,
  tripNote,
  tripFiles,
  tripSaving,
  onClose,
  onTripNameChange,
  onTripNoteChange,
  onTripFilesChange,
  onSubmit,
}: TripCreateDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-[1100] flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-md space-y-3 rounded-xl bg-white p-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800">添加足迹</h3>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            关闭
          </button>
        </div>

        <input
          type="text"
          placeholder="足迹名称（必填）"
          value={tripName}
          onChange={(e) => onTripNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSubmit();
            }
          }}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#7E9D82]"
        />

        <textarea
          placeholder="简介（可选）"
          value={tripNote}
          onChange={(e) => onTripNoteChange(e.target.value)}
          className="h-20 w-full resize-none rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#7E9D82]"
        />

        <div className="space-y-1">
          <label className="block text-sm text-slate-700">图片（可选，可多选，自动压缩）</label>
          <div className="flex items-center gap-3">
            <label
              htmlFor="trip-image-upload"
              className="inline-flex cursor-pointer items-center rounded bg-slate-100 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-200"
            >
              选择图片
            </label>
            <span className="text-xs text-slate-500">
              {tripFiles.length > 0 ? `已选择 ${tripFiles.length} 张图片` : '未选择文件'}
            </span>
          </div>
          <div className="text-xs text-slate-500">最多上传 3 张，系统会自动压缩后再上传。</div>
          <input
            id="trip-image-upload"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            onChange={(e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              if (files.length > 3) {
                window.alert('最多只能选择 3 张图片，系统将保留前 3 张。');
              }
              onTripFilesChange(files.slice(0, 3));
            }}
            className="hidden"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            disabled={tripSaving}
            className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            取消
          </button>
          <button
            onClick={onSubmit}
            disabled={tripSaving}
            className="flex-1 rounded bg-[#7E9D82] px-3 py-2 text-sm text-white hover:bg-[#6F8B73] disabled:opacity-60"
          >
            {tripSaving ? '保存中...' : '保存足迹'}
          </button>
        </div>
      </div>
    </div>
  );
}
