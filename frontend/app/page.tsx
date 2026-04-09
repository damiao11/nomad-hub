'use client';

import dynamic from 'next/dynamic';

// 注意这里的路径：没有 src，直接从当前项目的 components 找
// @/ 代表根目录
const DynamicMap = dynamic(() => import('@/components/map/LeafletMap'), { 
  ssr: false,
  loading: () => <div className="h-screen w-full flex items-center justify-center bg-gray-50 text-gray-500">正在开启游牧地图...</div>
});

export default function Home() {
  return (
    <main className="h-screen w-full relative">
      <DynamicMap />
    </main>
  );
}