'use client';

import type { CSSProperties } from 'react';

type PreviewImageItem = {
  src: string;
  alt: string;
};

type ImagePreviewOverlayProps = {
  activePreview: PreviewImageItem | null;
  previewImagesLength: number;
  previewIndex: number;
  previewControlsVisible: boolean;
  previewControlStyle: CSSProperties;
  onClose: () => void;
  onRevealControls: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export default function ImagePreviewOverlay({
  activePreview,
  previewImagesLength,
  previewIndex,
  previewControlsVisible,
  previewControlStyle,
  onClose,
  onRevealControls,
  onPrev,
  onNext,
}: ImagePreviewOverlayProps) {
  if (!activePreview) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 z-[1400] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      onMouseMove={onRevealControls}
      onTouchStart={onRevealControls}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
        onMouseMove={onRevealControls}
      >
        {previewImagesLength > 1 && (
          <>
            <button
              type="button"
              onClick={onPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md border border-white/35 bg-white/22 px-2.5 py-1.5 text-xl font-bold leading-none text-white/90 backdrop-blur-sm transition-all hover:bg-white/30 md:left-2"
              style={{ ...previewControlStyle, left: 'max(0.5rem, env(safe-area-inset-left))' }}
              aria-label="上一张"
            >
              &lt;
            </button>
            <button
              type="button"
              onClick={onNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-white/35 bg-white/22 px-2.5 py-1.5 text-xl font-bold leading-none text-white/90 backdrop-blur-sm transition-all hover:bg-white/30 md:right-24"
              style={{ ...previewControlStyle, right: 'max(0.5rem, env(safe-area-inset-right))' }}
              aria-label="下一张"
            >
              &gt;
            </button>
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          className="absolute rounded-md border border-white/35 bg-white/22 px-2.5 py-1 text-xl font-bold leading-none text-white/90 backdrop-blur-sm transition-all hover:bg-white/30"
          style={{
            ...previewControlStyle,
            right: 'max(0.5rem, env(safe-area-inset-right))',
            top: 'max(0.5rem, env(safe-area-inset-top))',
          }}
        >
          ×
        </button>
        {previewImagesLength > 1 && (
          <div
            className="absolute rounded-md border border-white/30 bg-white/20 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur-sm transition-all"
            style={{
              opacity: previewControlsVisible ? 1 : 0,
              left: 'max(0.5rem, env(safe-area-inset-left))',
              top: 'max(0.5rem, env(safe-area-inset-top))',
            }}
          >
            {previewIndex + 1} / {previewImagesLength}
          </div>
        )}
        <img
          src={activePreview.src}
          alt={activePreview.alt}
          className="max-h-[92vh] w-full rounded-lg object-contain"
        />
      </div>
    </div>
  );
}
