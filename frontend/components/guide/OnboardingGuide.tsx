'use client';

import { useState } from 'react';

const STEPS = [
  {
    icon: '🗺️',
    title: '记录足迹',
    desc: '点击地图任意位置，添加你去过的地方。配上照片和备注，打造专属旅行地图。',
  },
  {
    icon: '📍',
    title: '实时位置共享',
    desc: '创建或加入群组，和朋友互相看到实时位置。一起出游不再走散。',
  },
  {
    icon: '💬',
    title: '群组聊天',
    desc: '在群组里聊天交流，消息永久保存。分享旅行中的精彩瞬间。',
  },
  {
    icon: '🔍',
    title: '搜索地点与足迹',
    desc: '顶部搜索框统一搜索地点和已保存的足迹，快速定位想去的地方。',
  },
];

export default function OnboardingGuide({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="text-center space-y-4">
          <div className="text-5xl">{STEPS[step].icon}</div>
          <h2 className="text-lg font-bold text-slate-800">{STEPS[step].title}</h2>
          <p className="text-sm text-slate-500 leading-relaxed">{STEPS[step].desc}</p>

          {/* 进度点 */}
          <div className="flex justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1.5 w-1.5 rounded-full transition-colors ${i === step ? 'bg-[#7E9D82]' : 'bg-slate-200'}`} />
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
                上一步
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(step + 1)}
                className="flex-1 rounded-lg bg-[#7E9D82] px-4 py-2.5 text-sm text-white hover:bg-[#6F8B73]">
                下一步
              </button>
            ) : (
              <button onClick={onClose}
                className="flex-1 rounded-lg bg-[#7E9D82] px-4 py-2.5 text-sm text-white hover:bg-[#6F8B73]">
                开始探索
              </button>
            )}
          </div>

          {step === STEPS.length - 1 && (
            <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600">
              跳过引导
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
