'use client';

type BottomControlBarProps = {
  groupCode: string | null;
  isSharingEnabled: boolean;
  locatePulse: boolean;
  myAccuracy: number | null;
  onToggleGroupPanel: () => void;
  onToggleSharing: () => void;
  onFocusMyLocation: () => void;
};

export default function BottomControlBar({
  groupCode,
  isSharingEnabled,
  locatePulse,
  myAccuracy,
  onToggleGroupPanel,
  onToggleSharing,
  onFocusMyLocation,
}: BottomControlBarProps) {
  return (
    <>
      <div className="absolute right-20 z-[1000] flex items-center gap-2 mobile-safe-bottom [--safe-bottom-base:1.5rem]">
        <button
          onClick={onToggleGroupPanel}
          aria-label="群组设置"
          title={groupCode ? `当前群组：${groupCode}` : '创建或加入群组'}
          className={`flex h-12 items-center gap-2 rounded-full border px-3 text-sm font-medium backdrop-blur-sm transition-all duration-200 ${groupCode ? 'border-[#7E9D82] bg-[#7E9D82]/90 text-white hover:bg-[#6F8B73]' : 'border-white/70 bg-white/95 text-[#6F8B73] hover:bg-white'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-5 w-5">
            <path d="M10 14a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />
            <path d="M20 8v6M23 11h-6" />
            <path d="M2 12h2" />
            <path d="M4 12a6 6 0 0 0 12 0" />
          </svg>
          <span>{groupCode ? `群组 ${groupCode}` : '加入群组'}</span>
        </button>

        <button
          onClick={onToggleSharing}
          aria-label="实时共享开关"
          title={isSharingEnabled ? '当前为共享中，点击切换为独自使用' : '当前为独自使用，点击开启共享'}
          className={`flex h-12 items-center gap-2 rounded-full border px-3 text-sm font-medium backdrop-blur-sm transition-all duration-200 ${isSharingEnabled ? 'border-[#7E9D82] bg-[#7E9D82] text-white hover:bg-[#6F8B73]' : 'border-white/70 bg-white/95 text-[#6F8B73] hover:bg-white'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-5 w-5">
            <path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
          </svg>
          <span>{isSharingEnabled ? '共享中' : '独自使用'}</span>
        </button>
      </div>

      <button
        onClick={onFocusMyLocation}
        aria-label="定位到我"
        title="定位到我"
        className="absolute right-4 z-[1000] flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-white/95 text-[#6F8B73] backdrop-blur-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-white active:scale-95 active:shadow-md mobile-safe-bottom [--safe-bottom-base:1.5rem]"
      >
        {locatePulse && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-[#7E9D82]/45 animate-ping [animation-duration:900ms]"
          />
        )}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1 rounded-full shadow-[0_0_0_3px_rgba(255,255,255,0.40),0_10px_24px_rgba(126,157,130,0.22)]"
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.7"
          className="h-6 w-6 transition-transform duration-200 ease-out"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3" />
          <path d="M12 19v3" />
          <path d="M2 12h3" />
          <path d="M19 12h3" />
        </svg>
      </button>

      <div className="absolute right-4 z-[1000] rounded-lg border border-white/60 bg-white/90 px-3 py-1.5 text-xs text-slate-700 shadow-sm backdrop-blur-sm mobile-safe-bottom [--safe-bottom-base:5rem]">
        定位精度：{myAccuracy !== null ? `${Math.round(myAccuracy)} m` : '获取中'}
      </div>
    </>
  );
}
