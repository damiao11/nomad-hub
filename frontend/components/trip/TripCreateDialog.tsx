'use client';

import { memo, useRef } from 'react';

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

const MAX_FILES = 3;

const TripCreateDialog = memo(function TripCreateDialog({
  open, tripName, tripNote, tripFiles, tripSaving,
  onClose, onTripNameChange, onTripNoteChange, onTripFilesChange, onSubmit,
}: TripCreateDialogProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return;
    const combined = [...tripFiles, ...Array.from(newFiles)].slice(0, MAX_FILES);
    onTripFilesChange(combined);
    // 重置 input 以便重复选择同一文件
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeFile = (index: number) => {
    onTripFilesChange(tripFiles.filter((_, i) => i !== index));
  };

  return (
    <div className="absolute inset-0 z-[1100] flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-md space-y-3 rounded-xl bg-white p-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800">添加足迹</h3>
          <button onClick={onClose} className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100">关闭</button>
        </div>

        <input type="text" placeholder="足迹名称（必填）" value={tripName}
          onChange={(e) => onTripNameChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSubmit(); }}}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#7E9D82]" />

        <textarea placeholder="简介（可选）" value={tripNote}
          onChange={(e) => onTripNoteChange(e.target.value)}
          className="h-20 w-full resize-none rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#7E9D82]" />

        {/* 照片逐张添加 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => fileRef.current?.click()}
              disabled={tripFiles.length >= MAX_FILES}
              className="rounded bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200 disabled:opacity-50">
              + 添加照片
            </button>
            <span className="text-xs text-slate-400">{tripFiles.length}/{MAX_FILES} 张</span>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple
            onChange={(e) => addFiles(e.target.files)} className="hidden" />

          {/* 已选照片缩略图 */}
          {tripFiles.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {tripFiles.map((file, i) => (
                <div key={`${file.name}-${i}`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-slate-200">
                  <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                  <button onClick={() => removeFile(i)}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white shadow">×</button>
                </div>
              ))}
            </div>
          )}
          <div className="text-[10px] text-slate-400">系统自动压缩，保存可能需要几秒</div>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} disabled={tripSaving}
            className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60">取消</button>
          <button onClick={onSubmit} disabled={tripSaving}
            className="flex-1 rounded bg-[#7E9D82] px-3 py-2 text-sm text-white hover:bg-[#6F8B73] disabled:opacity-60">
            {tripSaving ? '保存中...' : '保存足迹'}
          </button>
        </div>
      </div>
    </div>
  );
});

export default TripCreateDialog;
