'use client';

import { memo } from 'react';

type TripEditDialogProps = {
  open: boolean;
  editTripName: string;
  editTripNote: string;
  editTripFiles: File[];
  editTripSaving: boolean;
  editTripHasImages: boolean;
  existingImageCount: number;
  maxImageCount: number;
  editImageMode: 'keep' | 'replace' | 'clear';
  onClose: () => void;
  onEditTripNameChange: (value: string) => void;
  onEditTripNoteChange: (value: string) => void;
  onEditTripFilesChange: (files: File[]) => void;
  onEditImageModeChange: (mode: 'keep' | 'replace' | 'clear') => void;
  onSubmit: () => void;
};

const TripEditDialog = memo(function TripEditDialog({
  open,
  editTripName,
  editTripNote,
  editTripFiles,
  editTripSaving,
  editTripHasImages,
  existingImageCount,
  maxImageCount,
  editImageMode,
  onClose,
  onEditTripNameChange,
  onEditTripNoteChange,
  onEditTripFilesChange,
  onEditImageModeChange,
  onSubmit,
}: TripEditDialogProps) {
  if (!open) {
    return null;
  }

  const availableSlots = Math.max(0, maxImageCount - existingImageCount);

  const handleEditFileSelection = (selected: FileList | null) => {
    const files = selected ? Array.from(selected) : [];
    const selectLimit = editTripHasImages ? availableSlots : maxImageCount;

    if (selectLimit <= 0) {
      window.alert('当前已达到 3 张上限，如需继续上传请先清空图片。');
      onEditTripFilesChange([]);
      return;
    }

    if (files.length > selectLimit) {
      window.alert(`当前最多还能新增 ${selectLimit} 张，系统将保留前 ${selectLimit} 张。`);
    }

    onEditTripFilesChange(files.slice(0, selectLimit));
  };

  return (
    <div className="absolute inset-0 z-[1100] flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-md space-y-3 rounded-xl bg-white p-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800">修改足迹</h3>
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
          value={editTripName}
          onChange={(e) => onEditTripNameChange(e.target.value)}
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
          value={editTripNote}
          onChange={(e) => onEditTripNoteChange(e.target.value)}
          className="h-20 w-full resize-none rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#7E9D82]"
        />

        <div className="space-y-2">
          <div className="text-sm text-slate-700">图片</div>

          {!editTripHasImages ? (
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <label
                  htmlFor="edit-trip-image-upload"
                  className="inline-flex cursor-pointer items-center rounded bg-slate-100 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-200"
                >
                  添加图片
                </label>
                <span className="text-xs text-slate-500">
                  {editTripFiles.length > 0 ? `已选择 ${editTripFiles.length} 张图片` : '未选择文件'}
                </span>
              </div>
              <input
                id="edit-trip-image-add"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                multiple
                onChange={(e) => {
                  handleEditFileSelection(e.target.files);
                  onEditImageModeChange('replace');
                }}
                className="hidden"
              />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-3 text-sm text-slate-700">
                <label className="inline-flex items-center gap-1">
                  <input
                    type="radio"
                    name="edit-image-mode"
                    checked={editImageMode === 'replace'}
                    onChange={() => onEditImageModeChange('replace')}
                  />
                  新增图片（保留原图）
                </label>
                <label className="inline-flex items-center gap-1">
                  <input
                    type="radio"
                    name="edit-image-mode"
                    checked={editImageMode === 'clear'}
                    onChange={() => {
                      onEditImageModeChange('clear');
                      onEditTripFilesChange([]);
                    }}
                  />
                  清空图片
                </label>
              </div>

              {editImageMode === 'replace' && (
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="edit-trip-image-upload"
                      className="inline-flex cursor-pointer items-center rounded bg-slate-100 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-200"
                    >
                      选择新图片
                    </label>
                    <span className="text-xs text-slate-500">
                      {editTripFiles.length > 0 ? `已选择 ${editTripFiles.length} 张图片` : '未选择文件'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    系统会自动压缩图片后上传，当前已有 {existingImageCount} 张，还可新增 {availableSlots} 张（总上限 {maxImageCount} 张）。
                  </div>
                  <input
                    id="edit-trip-image-new"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    multiple
                    onChange={(e) => handleEditFileSelection(e.target.files)}
                    className="hidden"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            disabled={editTripSaving}
            className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            取消
          </button>
          <button
            onClick={onSubmit}
            disabled={editTripSaving}
            className="flex-1 rounded bg-[#7E9D82] px-3 py-2 text-sm text-white hover:bg-[#6F8B73] disabled:opacity-60"
          >
            {editTripSaving ? '保存中...' : '保存修改'}
          </button>
        </div>
      </div>
    </div>
  );
});

export default TripEditDialog;
