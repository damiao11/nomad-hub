'use client';

import { memo, useRef } from 'react';

type TripEditDialogProps = {
  open: boolean;
  editTripName: string;
  editTripNote: string;
  editTripCategory: string;
  editTripFiles: File[];
  editTripSaving: boolean;
  editTripHasImages: boolean;
  existingImageCount: number;
  maxImageCount: number;
  editImageMode: 'keep' | 'replace' | 'clear';
  onClose: () => void;
  onEditTripNameChange: (value: string) => void;
  onEditTripNoteChange: (value: string) => void;
  onEditTripCategoryChange: (value: string) => void;
  onEditTripFilesChange: (files: File[]) => void;
  onEditImageModeChange: (mode: 'keep' | 'replace' | 'clear') => void;
  onSubmit: () => void;
};

const CATEGORIES = ['美食', '风景', '住宿', '交通', '购物', '其他'];

const MAX_FILES = 3;

const TripEditDialog = memo(function TripEditDialog({
  open, editTripName, editTripNote, editTripCategory, editTripFiles, editTripSaving,
  editTripHasImages, existingImageCount, maxImageCount, editImageMode,
  onClose, onEditTripNameChange, onEditTripNoteChange, onEditTripCategoryChange,
  onEditTripFilesChange, onEditImageModeChange, onSubmit,
}: TripEditDialogProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const totalCount = existingImageCount + editTripFiles.length;
  const canAdd = totalCount < MAX_FILES;

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return;
    const slots = MAX_FILES - existingImageCount - editTripFiles.length;
    if (slots <= 0) return;
    const toAdd = Array.from(newFiles).slice(0, slots);
    const combined = [...editTripFiles, ...toAdd];
    onEditTripFilesChange(combined);
    onEditImageModeChange('replace');
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeFile = (index: number) => {
    const next = editTripFiles.filter((_, i) => i !== index);
    onEditTripFilesChange(next);
    if (next.length === 0) onEditImageModeChange('keep');
  };

  return (
    <div className="absolute inset-0 z-[1100] flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-md space-y-3 rounded-xl bg-white p-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800">修改足迹</h3>
          <button onClick={onClose} className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100">关闭</button>
        </div>

        <input type="text" placeholder="足迹名称（必填）" value={editTripName}
          onChange={(e) => onEditTripNameChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSubmit(); }}}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#7E9D82]" />

        <textarea placeholder="简介（可选）" value={editTripNote}
          onChange={(e) => onEditTripNoteChange(e.target.value)}
          className="h-20 w-full resize-none rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#7E9D82]" />

        {/* 分类选择 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500">分类：</span>
          {CATEGORIES.map((cat) => (
            <button key={cat} type="button"
              onClick={() => onEditTripCategoryChange(editTripCategory === cat ? '' : cat)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${editTripCategory === cat ? 'bg-[#7E9D82] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {cat}
            </button>
          ))}
        </div>

        {/* 照片管理 */}
        <div className="space-y-2">
          <div className="text-sm text-slate-700">
            图片 {existingImageCount > 0 && <span className="text-slate-400">（已有 {existingImageCount} 张）</span>}
          </div>

          {/* 清空已有图片 */}
          {editTripHasImages && (
            <button onClick={() => { onEditImageModeChange('clear'); onEditTripFilesChange([]); }}
              className="text-xs text-red-500 hover:underline">清空已有图片</button>
          )}

          {/* 新增照片按钮 */}
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => fileRef.current?.click()}
              disabled={!canAdd}
              className="rounded bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200 disabled:opacity-50">
              + 添加照片
            </button>
            <span className="text-xs text-slate-400">{totalCount}/{MAX_FILES} 张</span>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple
            onChange={(e) => addFiles(e.target.files)} className="hidden" />

          {/* 新增照片缩略图 */}
          {editTripFiles.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {editTripFiles.map((file, i) => (
                <div key={`new-${file.name}-${i}`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-slate-200">
                  <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                  <button onClick={() => removeFile(i)}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white shadow">×</button>
                </div>
              ))}
            </div>
          )}
          <div className="text-[10px] text-slate-400">系统自动压缩</div>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} disabled={editTripSaving}
            className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60">取消</button>
          <button onClick={onSubmit} disabled={editTripSaving}
            className="flex-1 rounded bg-[#7E9D82] px-3 py-2 text-sm text-white hover:bg-[#6F8B73] disabled:opacity-60">
            {editTripSaving ? '保存中...' : '保存修改'}
          </button>
        </div>
      </div>
    </div>
  );
});

export default TripEditDialog;
