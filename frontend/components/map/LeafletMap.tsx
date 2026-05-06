'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import L from 'leaflet';
import 'leaflet.markercluster';
import { useEffect, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { io } from 'socket.io-client';
import { MapPin } from 'lucide-react';
import GroupChatPanel from '@/components/chat/GroupChatPanel';
import GroupInvitePanel from '@/components/group/GroupInvitePanel';
import LoginPanel from '@/components/auth/LoginPanel';
import TripCreateDialog from '@/components/trip/TripCreateDialog';
import TripEditDialog from '@/components/trip/TripEditDialog';
import ImagePreviewOverlay from '@/components/media/ImagePreviewOverlay';
import MapSearchBar from '@/components/search/MapSearchBar';
import BottomControlBar from '@/components/map/BottomControlBar';
import NoticeDialog from '@/components/common/NoticeDialog';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { useGroupChat } from '@/hooks/useGroupChat';
import { useGroupInvite } from '@/hooks/useGroupInvite';
import { useAuth } from '@/hooks/useAuth';
import { useTrip } from '@/hooks/useTrip';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || '';
const SOCKET_PROBE_URL = `${API_BASE_URL}/socket.io/?EIO=4&transport=polling`;
const socket = io(API_BASE_URL, {
  autoConnect: false,
  reconnection: false,
  timeout: 5000,
  transports: ['websocket', 'polling'],
});

// --- 1. 图标生成函数 ---
const createColoredIcon = (color: 'red' | 'blue' | 'green' | 'purple' | 'yellow') => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="marker-pin ${color}"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
};

const createCurrentLocationIcon = () => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#1e3a8a" flood-opacity="0.35"/>
        </filter>
      </defs>
      <path filter="url(#shadow)" d="M18 2C10.27 2 4 8.27 4 16c0 9.78 10.95 20.91 13.46 23.34a.78.78 0 0 0 1.08 0C21.05 36.91 32 25.78 32 16 32 8.27 25.73 2 18 2z" fill="#3B82F6"/>
      <circle cx="18" cy="16" r="6" fill="#DBEAFE"/>
    </svg>
  `;

  return L.icon({
    iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    iconSize: [36, 48],
    iconAnchor: [18, 46],
    popupAnchor: [0, -42],
  });
};

const currentLocationIcon = createCurrentLocationIcon();

const createSavedTripIcon = () => {
  const pinSvg = renderToStaticMarkup(
    <MapPin size={16} strokeWidth={2.4} className="saved-trip-map-pin" fill="currentColor" />
  );

  return L.divIcon({
    className: 'saved-trip-div-icon',
    html: `
      <div class="saved-trip-pin animate-pulse" aria-hidden="true">
        <div class="saved-trip-pin-shell">${pinSvg}</div>
        <span class="saved-trip-pin-core"></span>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -18],
  });
};

const savedTripIcon = createSavedTripIcon();

const SEARCH_FOCUS_ZOOM = 17;
const GEO_ACCURACY_THRESHOLD_METERS = 60;
const FIRST_FIX_MAX_ACCURACY_METERS = 120;
const EARTH_A = 6378245.0;
const EE = 0.00669342162296594323;

const createSearchHintIcon = () => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <defs>
        <filter id="searchHintGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#7E9D82" flood-opacity="0.52"/>
        </filter>
      </defs>
      <circle cx="20" cy="20" r="7" fill="#7E9D82" fill-opacity="0.46" filter="url(#searchHintGlow)">
        <animate attributeName="r" from="7" to="18" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="fill-opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite"/>
      </circle>
      <circle cx="20" cy="20" r="5.2" fill="#6F8B73" stroke="#ffffff" stroke-width="2.4"/>
    </svg>
  `;

  return L.icon({
    iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -14],
  });
};

const searchHintIcon = createSearchHintIcon();

type SearchResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

type PreviewImageItem = {
  src: string;
  alt: string;
};

const MAX_IMAGE_EDGE_PX = 1280;
const MIN_IMAGE_EDGE_PX = 640;
const INITIAL_IMAGE_QUALITY = 0.62;
const MIN_IMAGE_QUALITY = 0.3;
const TARGET_IMAGE_BYTES = 320 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 60 * 1024 * 1024;
const MAX_UPLOAD_IMAGE_COUNT = 3;

const isValidHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const estimateDataUrlBytes = (dataUrl: string) => {
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex < 0) return dataUrl.length;
  const base64Length = dataUrl.length - commaIndex - 1;
  return Math.floor((base64Length * 3) / 4);
};

const getScaledSize = (width: number, height: number, maxSide: number) => {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /Mobi|Android/i.test(navigator.userAgent);
};

const isOldBrowser = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // vivo 自带浏览器、旧版 WebView
  if (/VivoBrowser/i.test(ua)) return true;
  if (/Android/.test(ua) && /AppleWebKit/.test(ua) && !/Chrome/.test(ua) && !/Quark/.test(ua) && !/Edge/.test(ua)) return true;
  return false;
};

const compressImageFile = (file: File, maxSide = MAX_IMAGE_EDGE_PX, quality = INITIAL_IMAGE_QUALITY) => {
  return new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('仅支持图片文件'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('图片压缩失败'));
        return;
      }

      // 手机端简化压缩：单次缩放，更小尺寸减少保存时间
      if (isMobileDevice()) {
        const mobileMaxSide = Math.min(maxSide, 640);
        const targetSize = getScaledSize(width, height, mobileMaxSide);
        canvas.width = targetSize.width;
        canvas.height = targetSize.height;
        ctx.drawImage(image, 0, 0, targetSize.width, targetSize.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
        URL.revokeObjectURL(objectUrl);
        resolve(dataUrl);
        return;
      }

      let currentMaxSide = maxSide;
      let currentQuality = quality;
      let bestDataUrl = '';

      while (true) {
        const targetSize = getScaledSize(width, height, currentMaxSide);
        canvas.width = targetSize.width;
        canvas.height = targetSize.height;
        ctx.clearRect(0, 0, targetSize.width, targetSize.height);
        ctx.drawImage(image, 0, 0, targetSize.width, targetSize.height);

        const dataUrl = canvas.toDataURL('image/jpeg', currentQuality);
        bestDataUrl = dataUrl;
        const bytes = estimateDataUrlBytes(dataUrl);

        if (bytes <= TARGET_IMAGE_BYTES) {
          break;
        }

        if (currentQuality > MIN_IMAGE_QUALITY) {
          currentQuality = Math.max(MIN_IMAGE_QUALITY, currentQuality - 0.08);
          continue;
        }

        if (currentMaxSide > MIN_IMAGE_EDGE_PX) {
          currentMaxSide = Math.max(MIN_IMAGE_EDGE_PX, Math.round(currentMaxSide * 0.85));
          currentQuality = INITIAL_IMAGE_QUALITY;
          continue;
        }

        break;
      }

      URL.revokeObjectURL(objectUrl);
      resolve(bestDataUrl);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('图片读取失败'));
    };

    image.src = objectUrl;
  });
};

const fileToBase64 = (file: File) => {
  return new Promise<string>((resolve, reject) => {
    compressImageFile(file)
      .then(resolve)
      .catch(() => {
        if (file.size > 2 * 1024 * 1024) {
          reject(new Error('图片压缩失败，请更换图片或减少图片数量'));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsDataURL(file);
      });
  });
};

const filesToBase64Array = async (files: File[] | FileList) => {
  const originalArray = Array.from(files);
  if (originalArray.length > MAX_UPLOAD_IMAGE_COUNT) {
    throw new Error(`最多可上传 ${MAX_UPLOAD_IMAGE_COUNT} 张图片`);
  }
  const fileArray = originalArray.slice(0, MAX_UPLOAD_IMAGE_COUNT);

  const encoded = await Promise.all(fileArray.map((file) => fileToBase64(file)));
  const result = encoded.filter((item) => item.trim() !== '');
  const totalBytes = result.reduce((sum, item) => sum + estimateDataUrlBytes(item), 0);
  if (totalBytes > MAX_TOTAL_IMAGE_BYTES) {
    throw new Error('图片总大小过大，请减少图片数量或使用更小图片');
  }

  return result;
};

const parseTripImages = (value: unknown): string[] => {
  if (typeof value !== 'string' || value.trim() === '') {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
    }
  } catch {
    // 兼容旧数据：单张 URL 字符串。
  }

  if (value.startsWith('data:image/') || isValidHttpUrl(value)) {
    return [value];
  }

  return [];
};

const normalizeTripPhotoPayload = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    const filtered = value.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
    return filtered.length > 0 ? JSON.stringify(filtered) : '';
  }

  return '';
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

const outOfChina = (lat: number, lng: number) => {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
};

const transformLat = (x: number, y: number) => {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin(y / 3.0 * Math.PI)) * 2.0 / 3.0;
  ret += (160.0 * Math.sin(y / 12.0 * Math.PI) + 320.0 * Math.sin(y * Math.PI / 30.0)) * 2.0 / 3.0;
  return ret;
};

const transformLng = (x: number, y: number) => {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin(x / 3.0 * Math.PI)) * 2.0 / 3.0;
  ret += (150.0 * Math.sin(x / 12.0 * Math.PI) + 300.0 * Math.sin(x / 30.0 * Math.PI)) * 2.0 / 3.0;
  return ret;
};

const gcj02ToWgs84 = (lat: number, lng: number): [number, number] => {
  if (outOfChina(lat, lng)) {
    return [lat, lng];
  }

  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = lat / 180.0 * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / ((EARTH_A * (1 - EE)) / (magic * sqrtMagic) * Math.PI);
  dLng = (dLng * 180.0) / (EARTH_A / sqrtMagic * Math.cos(radLat) * Math.PI);
  const mgLat = lat + dLat;
  const mgLng = lng + dLng;
  return [lat * 2 - mgLat, lng * 2 - mgLng];
};

const wgs84ToGcj02 = (lat: number, lng: number): [number, number] => {
  if (outOfChina(lat, lng)) {
    return [lat, lng];
  }

  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = lat / 180.0 * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / ((EARTH_A * (1 - EE)) / (magic * sqrtMagic) * Math.PI);
  dLng = (dLng * 180.0) / (EARTH_A / sqrtMagic * Math.cos(radLat) * Math.PI);
  return [lat + dLat, lng + dLng];
};

const toMapPosition = (lat: number, lng: number, useGcj: boolean): [number, number] => {
  if (!useGcj) {
    return [lat, lng];
  }
  return wgs84ToGcj02(lat, lng);
};

const toStoragePosition = (lat: number, lng: number, useGcj: boolean): [number, number] => {
  if (!useGcj) {
    return [lat, lng];
  }
  return gcj02ToWgs84(lat, lng);
};

// 足迹分类颜色
const CATEGORY_COLORS: Record<string, string> = {
  '美食': '#ef4444', '风景': '#22c55e', '住宿': '#3b82f6',
  '交通': '#f59e0b', '购物': '#a855f7', '其他': '#6b7280',
};

const CATEGORIES = ['美食', '风景', '住宿', '交通', '购物', '其他'];

const createTripClusterIcon = (color: string) => {
  return L.divIcon({
    className: 'trip-cluster-icon',
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

function TripMarkers({ trips, onEdit, onDelete, onImageClick }: {
  trips: any[];
  onEdit: (trip: any) => void;
  onDelete: (id: number) => void;
  onImageClick: (images: PreviewImageItem[], index: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const clusterGroup = (L as any).markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div style="background:#7E9D82;color:white;width:${count > 10 ? 40 : 32}px;height:${count > 10 ? 40 : 32}px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${count > 10 ? 13 : 11}px;font-weight:bold;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3)">${count}</div>`,
          iconSize: L.point(count > 10 ? 40 : 32, count > 10 ? 40 : 32),
          className: '',
        });
      },
    });

    trips.forEach((trip) => {
      const color = CATEGORY_COLORS[trip.category] || CATEGORY_COLORS['其他'];
      const icon = createTripClusterIcon(color);
      const pos: [number, number] = toMapPosition(trip.lat, trip.lng, true);

      const tripImages = parseTripImages(trip.photoUrl).map((image, index) => ({
        src: image,
        alt: `${trip.name}-${index + 1}`,
      }));

      const marker = L.marker(pos, { icon });

      const popupContent = `
        <div style="min-width:200px;padding:4px">
          ${tripImages.map((item: PreviewImageItem, i: number) => `
            <img src="${item.src}" alt="${item.alt}" style="width:100%;height:80px;object-fit:cover;border-radius:6px;cursor:pointer;margin-bottom:4px" onclick="window.__tripImgClick && window.__tripImgClick('${trip.id}', ${i})" />
          `).join('')}
          <div style="font-size:13px;font-weight:600;color:#333">${trip.category ? '<span style="display:inline-block;background:' + (CATEGORY_COLORS[trip.category] || CATEGORY_COLORS['其他']) + ';color:white;font-size:10px;padding:1px 6px;border-radius:4px;margin-right:4px">' + trip.category + '</span>' : ''}${trip.name}</div>
          <p style="font-size:11px;color:#888;margin:4px 0">${trip.note || ''}</p>
          <div style="font-size:10px;color:#aaa;margin-bottom:4px">${new Date(trip.createdAt).toLocaleString()}</div>
          <button onclick="window.__tripEdit && window.__tripEdit('${trip.id}')" style="background:#7E9D82;color:white;border:none;padding:4px 8px;border-radius:4px;font-size:11px;margin-right:4px;cursor:pointer">修改</button>
          <button onclick="window.__tripDelete && window.__tripDelete('${trip.id}')" style="background:#ef4444;color:white;border:none;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer">删除</button>
        </div>`;

      marker.bindPopup(popupContent);
      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);

    return () => {
      map.removeLayer(clusterGroup);
      clusterGroup.clearLayers();
    };
  }, [trips, map]);

  // 全局回调绑定
  useEffect(() => {
    (window as any).__tripEdit = (id: string) => {
      const trip = trips.find((t) => String(t.id) === String(id));
      if (trip) onEdit(trip);
    };
    (window as any).__tripDelete = (id: string) => {
      onDelete(Number(id));
    };
    (window as any).__tripImgClick = (tripId: string, index: number) => {
      const trip = trips.find((t) => String(t.id) === String(tripId));
      if (trip) {
        const images = parseTripImages(trip.photoUrl).map((image, i) => ({
          src: image, alt: `${trip.name}-${i + 1}`,
        }));
        onImageClick(images, index);
      }
    };
    return () => {
      delete (window as any).__tripEdit;
      delete (window as any).__tripDelete;
      delete (window as any).__tripImgClick;
    };
  }, [trips, onEdit, onDelete, onImageClick]);

  return null;
}

function MapInstanceBridge({ onMapReady }: { onMapReady: (map: L.Map) => void }) {
  const map = useMap();

  useEffect(() => {
    // Keep tile source attribution while removing Leaflet brand prefix.
    map.attributionControl.setPrefix(false);
    onMapReady(map);
  }, [map, onMapReady]);

  return null;
}

// --- 2. 处理地图点击并保存到 MySQL 的组件 ---
function MapClickHandler({ onMapClick, userId, onNotice }: { onMapClick: (position: [number, number]) => void; userId: string | null; onNotice: (message: string) => void }) {
  useMapEvents({
    click: (e) => {
      if (!userId) {
        onNotice('请先登录');
        return;
      }

      const { lat, lng } = e.latlng;
      onMapClick([lat, lng]);
    },
  });
  return null;
}

// --- 3. 实时追踪逻辑组件 ---
function LiveLocationTracker({ onOthersUpdate, onMyPositionUpdate, onMyAccuracyUpdate, useGcjOffset, shareEnabled, groupCode, currentUserName, currentUserId }: { onOthersUpdate: (locs: any) => void; onMyPositionUpdate: (pos: [number, number]) => void; onMyAccuracyUpdate: (accuracy: number | null) => void; useGcjOffset: boolean; shareEnabled: boolean; groupCode: string | null; currentUserName: string | null; currentUserId: string | null }) {
  const [myPosition, setMyPosition] = useState<[number, number] | null>(null);
  const bestAccuracyRef = useRef<number>(Infinity);
  const socketEnabledRef = useRef(false);

  useEffect(() => {
    let canceled = false;

    const tryEnableSocket = async () => {
      if (!shareEnabled || !groupCode) {
        socketEnabledRef.current = false;
        onOthersUpdate({});
        socket.off('group-locations');
        return;
      }

      try {
        const probe = await fetch(SOCKET_PROBE_URL, { method: 'GET', cache: 'no-store' });
        if (!probe.ok || canceled) {
          socketEnabledRef.current = false;
          return;
        }

        socketEnabledRef.current = true;
        socket.on('group-locations', (locations) => {
          onOthersUpdate(locations);
        });
        socket.connect();
        socket.emit('join-group', { code: groupCode, userId: currentUserId, userName: currentUserName || '匿名游民' });
      } catch (error) {
        socketEnabledRef.current = false;
        console.warn('Socket 服务不可用，已跳过实时连接:', error);
      }
    };

    tryEnableSocket();

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const isFirstFix = bestAccuracyRef.current === Infinity;

        // 首次定位精度太差时先忽略，等待更好的点。
        if (isFirstFix && accuracy > FIRST_FIX_MAX_ACCURACY_METERS) {
          return;
        }

        // 过滤精度差且没有改善的坐标点，减少明显偏移。
        if (accuracy > GEO_ACCURACY_THRESHOLD_METERS && accuracy >= bestAccuracyRef.current) {
          return;
        }

        bestAccuracyRef.current = Math.min(bestAccuracyRef.current, accuracy);
        const newPos = toMapPosition(latitude, longitude, useGcjOffset);
        setMyPosition(newPos);
        onMyPositionUpdate(newPos);
        onMyAccuracyUpdate(accuracy);
        if (shareEnabled && groupCode && socketEnabledRef.current && socket.connected) {
          socket.emit('update-location', { lat: newPos[0], lng: newPos[1], userName: currentUserName || '我（在线）' });
        }
      },
      (err) => {
        console.warn('定位更新失败:', err.message);
        onMyAccuracyUpdate(null);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    return () => {
      canceled = true;
      navigator.geolocation.clearWatch(watchId);
      socket.off('group-locations');
    };
  }, [onMyAccuracyUpdate, onMyPositionUpdate, onOthersUpdate, useGcjOffset, shareEnabled, groupCode, currentUserName, currentUserId]);

  return myPosition ? (
    <Marker position={myPosition} icon={currentLocationIcon}>
      <Popup>{shareEnabled ? '这是我的实时位置（共享中）' : '这是我的实时位置（仅自己可见）'}</Popup>
    </Marker>
  ) : null;
}

const getColorForId = (id: string): 'blue' | 'green' | 'purple' => {
  const colors: ['blue', 'green', 'purple'] = ['blue', 'green', 'purple'];
  const charSum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[charSum % colors.length];
};

// --- 5. 主地图组件 ---
export default function LeafletMap() {
  const [showOldBrowserTip, setShowOldBrowserTip] = useState(isOldBrowser());
  const [others, setOthers] = useState<any>({});
  const { isLoggedIn, userId, userName, avatar, isAdmin, applyLogin, clearAuth, sendCode, register, login, resetPassword, updateProfile } = useAuth();
  const [myPosition, setMyPosition] = useState<[number, number] | null>(null);
  const [myAccuracy, setMyAccuracy] = useState<number | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [hasAutoLocated, setHasAutoLocated] = useState(false);
  const [locatePulse, setLocatePulse] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchHintPosition, setSearchHintPosition] = useState<[number, number] | null>(null);
  const [tripFormOpen, setTripFormOpen] = useState(false);
  const [pendingTripPosition, setPendingTripPosition] = useState<[number, number] | null>(null);
  const [tripName, setTripName] = useState('');
  const [tripNote, setTripNote] = useState('');
  const [tripCategory, setTripCategory] = useState('');
  const [tripFiles, setTripFiles] = useState<File[]>([]);
  const [tripSaving, setTripSaving] = useState(false);
  const [tripSearchQuery, setTripSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('darkMode') === '1';
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDeleteTripId, setPendingDeleteTripId] = useState<number | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [isSharingEnabled, setIsSharingEnabled] = useState(false);
  const [groupCode, setGroupCode] = useState<string | null>(null);
  const [editTripOpen, setEditTripOpen] = useState(false);
  const [editingTripId, setEditingTripId] = useState<number | null>(null);
  const [editingTripOriginalPhoto, setEditingTripOriginalPhoto] = useState('');
  const [editTripName, setEditTripName] = useState('');
  const [editTripNote, setEditTripNote] = useState('');
  const [editTripCategory, setEditTripCategory] = useState('');
  const [editTripFiles, setEditTripFiles] = useState<File[]>([]);
  const [editImageMode, setEditImageMode] = useState<'keep' | 'replace' | 'clear'>('keep');
  const [editTripSaving, setEditTripSaving] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [noticeCopyValue, setNoticeCopyValue] = useState<string | null>(null);
  const [previewImages, setPreviewImages] = useState<PreviewImageItem[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewControlsVisible, setPreviewControlsVisible] = useState(false);
  const previewControlsTimerRef = useRef<number | null>(null);
  const useGcjOffset = true;
  const defaultCenter: [number, number] = toMapPosition(30.28, 120.15, useGcjOffset);
  const { savedTrips, createTrip, updateTrip, removeTrip, clearTrips } = useTrip(API_BASE_URL, userId);

  const showNotice = (message: string, copyValue: string | null = null) => {
    setNoticeMessage(message);
    setNoticeCopyValue(copyValue);
  };

  const copyTextToClipboard = async (value: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch {
      // 浏览器禁用剪贴板权限时走回退逻辑。
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      return copied;
    } catch {
      return false;
    }
  };

  const {
    chatOpen,
    setChatOpen,
    chatInput,
    setChatInput,
    chatMessages,
    chatHasMore,
    chatLoadingMore,
    chatUnread,
    chatSending,
    groupMembers,
    chatListRef,
    loadOlderChatMessages,
    sendGroupMessage,
    resetChatState,
  } = useGroupChat({
    socket,
    isLoggedIn,
    groupCode,
    userId,
    userName,
    showNotice: (message) => showNotice(message),
    onKicked: () => {
      setGroupCode(null);
      setIsSharingEnabled(false);
      setOthers({});
    },
  });

  const {
    groupPanelOpen,
    setGroupPanelOpen,
    joinGroupDialogOpen,
    setJoinGroupDialogOpen,
    groupCodeInput,
    setGroupCodeInput,
    copyHintMessage,
    setCopyHintMessage,
    createGroup,
    joinGroupByCode,
    leaveGroup,
    copyGroupCode,
  } = useGroupInvite({
    socket,
    isLoggedIn,
    userId,
    userName,
    avatar,
    groupCode,
    setGroupCode,
    showNotice,
    copyTextToClipboard,
    onLeaveGroupCleanup: () => {
      setIsSharingEnabled(false);
      resetChatState();
      setOthers({});
    },
  });

  useEffect(() => {
    if (!locatePulse) return;
    const timer = setTimeout(() => setLocatePulse(false), 900);
    return () => clearTimeout(timer);
  }, [locatePulse]);

  useEffect(() => {
    if (!noticeMessage) return;
    const timer = window.setTimeout(() => {
      setNoticeMessage(null);
      setNoticeCopyValue(null);
    }, noticeCopyValue ? 4200 : 2200);
    return () => window.clearTimeout(timer);
  }, [noticeMessage, noticeCopyValue]);

  useEffect(() => {
    if (!mapInstance || hasAutoLocated) return;

    if (!navigator.geolocation) {
      setHasAutoLocated(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const current = toMapPosition(pos.coords.latitude, pos.coords.longitude, useGcjOffset);
        setMyPosition(current);
        mapInstance.flyTo(current, 16, { duration: 0.8 });
        setLocatePulse(true);
        setHasAutoLocated(true);
      },
      () => {
        // 首次获取失败时等待 watchPosition 的后续定位结果。
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [mapInstance, hasAutoLocated, useGcjOffset]);

  useEffect(() => {
    if (!mapInstance || hasAutoLocated || !myPosition) return;

    mapInstance.flyTo(myPosition, 16, { duration: 0.8 });
    setLocatePulse(true);
    setHasAutoLocated(true);
  }, [mapInstance, hasAutoLocated, myPosition]);

  useEffect(() => {
    if (!searchHintPosition) return;
    const timer = setTimeout(() => setSearchHintPosition(null), 2600);
    return () => clearTimeout(timer);
  }, [searchHintPosition]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      setSearchHintPosition(null);
    }
  }, [searchQuery]);

  // 初始化时恢复群组邀请码
  useEffect(() => {
    const storedGroupCode = localStorage.getItem('groupCode');
    if (storedGroupCode) {
      setGroupCode(storedGroupCode);
    }
  }, []);

  const openImagePreview = (images: PreviewImageItem[], index: number) => {
    if (images.length === 0) return;
    setPreviewImages(images);
    setPreviewIndex(Math.min(Math.max(index, 0), images.length - 1));
    setPreviewControlsVisible(true);
  };

  const closeImagePreview = () => {
    setPreviewImages([]);
    setPreviewControlsVisible(false);
    if (previewControlsTimerRef.current !== null) {
      window.clearTimeout(previewControlsTimerRef.current);
      previewControlsTimerRef.current = null;
    }
  };

  const revealPreviewControls = () => {
    setPreviewControlsVisible(true);
    if (previewControlsTimerRef.current !== null) {
      window.clearTimeout(previewControlsTimerRef.current);
    }
    previewControlsTimerRef.current = window.setTimeout(() => {
      setPreviewControlsVisible(false);
      previewControlsTimerRef.current = null;
    }, 900);
  };

  const showPreviousPreview = () => {
    if (previewImages.length <= 1) return;
    setPreviewIndex((prev) => (prev - 1 + previewImages.length) % previewImages.length);
  };

  const showNextPreview = () => {
    if (previewImages.length <= 1) return;
    setPreviewIndex((prev) => (prev + 1) % previewImages.length);
  };

  const activePreview = previewImages.length > 0 ? previewImages[previewIndex] : null;
  const previewControlStyle = {
    opacity: previewControlsVisible ? 1 : 0,
    pointerEvents: (previewControlsVisible ? 'auto' : 'none') as 'auto' | 'none',
  };

  useEffect(() => {
    if (!activePreview) {
      return;
    }

    revealPreviewControls();

    const handlePreviewKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeImagePreview();
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        showPreviousPreview();
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        showNextPreview();
      }
    };

    window.addEventListener('keydown', handlePreviewKeydown);
    return () => {
      window.removeEventListener('keydown', handlePreviewKeydown);
      if (previewControlsTimerRef.current !== null) {
        window.clearTimeout(previewControlsTimerRef.current);
        previewControlsTimerRef.current = null;
      }
    };
  }, [activePreview, previewImages.length]);

  const requestDeleteTrip = (id: number) => {
    setPendingDeleteTripId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteTrip = async () => {
    if (pendingDeleteTripId === null) return;
    setDeleteSubmitting(true);
    try {
      const result = await removeTrip(pendingDeleteTripId);
      if (result.ok) {
        showNotice('删除成功！');
      } else {
        showNotice(result.message || '删除失败，请检查后端连接');
      }
    } catch {
      showNotice('删除失败，请检查后端连接');
    } finally {
      setDeleteSubmitting(false);
      setDeleteConfirmOpen(false);
      setPendingDeleteTripId(null);
    }
  };

  const handleLoginSuccess = (newUserId: string, newUserName: string, newAvatar?: string, newIsAdmin?: boolean) => {
    applyLogin(newUserId, newUserName, newAvatar, newIsAdmin);
    if (!groupCode) {
      setGroupPanelOpen(true);
    }
  };

  const handleLogout = () => {
    clearAuth();
    setGroupCode(null);
    setGroupPanelOpen(false);
    setJoinGroupDialogOpen(false);
    setGroupCodeInput('');
    setIsSharingEnabled(false);
    resetChatState();
    clearTrips();
    setOthers({});
    socket.emit('leave-group');
    localStorage.removeItem('groupCode');
  };

  const toggleSharing = () => {
    if (!isLoggedIn) {
      showNotice('请先登录后再开启实时共享');
      return;
    }

    // 关闭共享不依赖群组状态，任何时候都应可直接关闭。
    if (isSharingEnabled) {
      setIsSharingEnabled(false);
      setOthers({});
      return;
    }

    if (!groupCode) {
      showNotice('请先创建或加入群组再开启共享');
      setGroupPanelOpen(true);
      return;
    }
    setIsSharingEnabled((prev) => {
      const next = !prev;
      if (!next) {
        setOthers({});
      }
      return next;
    });
  };

  const toggleChat = () => {
    if (!isLoggedIn) {
      showNotice('请先登录后再使用群聊');
      return;
    }

    if (!groupCode) {
      showNotice('请先加入群组再进入群聊');
      setGroupPanelOpen(true);
      return;
    }

    if (!isSharingEnabled) {
      showNotice('请先开启共享，再进入群聊');
      return;
    }

    setChatOpen((prev) => !prev);
  };

  const handleMapTripClick = (position: [number, number]) => {
    // 高德回退底图点击得到的是 GCJ-02 视觉坐标，入库前转回 WGS-84 保持数据统一。
    const normalized = toStoragePosition(position[0], position[1], useGcjOffset);
    setPendingTripPosition(normalized);
    setTripName('');
    setTripNote('');
    setTripCategory('');
    setTripFiles([]);
    setTripFormOpen(true);
  };

  const closeTripForm = () => {
    setTripFormOpen(false);
    setPendingTripPosition(null);
    setTripName('');
    setTripNote('');
    setTripFiles([]);
  };

  const openEditTripForm = (trip: any) => {
    setEditingTripId(trip.id);
    setEditTripName(typeof trip.name === 'string' ? trip.name : '');
    setEditTripNote(typeof trip.note === 'string' ? trip.note : '');
    setEditTripCategory(typeof trip.category === 'string' ? trip.category : '');
    setEditingTripOriginalPhoto(normalizeTripPhotoPayload(trip.photoUrl));
    setEditImageMode('keep');
    setEditTripFiles([]);
    setEditImageMode('keep');
    setEditTripOpen(true);
  };

  const closeEditTripForm = () => {
    setEditTripOpen(false);
    setEditingTripId(null);
    setEditTripName('');
    setEditTripNote('');
    setEditingTripOriginalPhoto('');
    setEditTripFiles([]);
    setEditImageMode('keep');
  };

  const submitTripForm = async () => {
    if (!userId) {
      showNotice('请先登录');
      return;
    }

    if (!pendingTripPosition) {
      showNotice('缺少位置坐标，请重新点击地图');
      return;
    }

    const trimmedName = tripName.trim();
    if (!trimmedName) {
      showNotice('请输入足迹名称');
      return;
    }

    setTripSaving(true);
    try {
      const imageBase64List = tripFiles.length > 0 ? await filesToBase64Array(tripFiles) : [];
      const photoUrl = imageBase64List.length > 0 ? JSON.stringify(imageBase64List) : '';

      const result = await createTrip({
        name: trimmedName,
        note: tripNote.trim(),
        category: tripCategory,
        photoUrl,
        lat: pendingTripPosition[0],
        lng: pendingTripPosition[1],
        userId,
      });

      if (result.ok) {
        showNotice('足迹已存入');
        closeTripForm();
      } else {
        showNotice(result.message || '保存失败，请检查后端连接');
      }
    } catch (error) {
      console.error('保存失败:', error);
      showNotice(getErrorMessage(error, '数据库连接失败，请检查后端'));
    } finally {
      setTripSaving(false);
    }
  };

  const submitEditTripForm = async () => {
    if (!userId) {
      showNotice('请先登录');
      return;
    }

    if (!editingTripId) {
      showNotice('未找到要修改的足迹');
      return;
    }

    const trimmedName = editTripName.trim();
    if (!trimmedName) {
      showNotice('请输入足迹名称');
      return;
    }

    setEditTripSaving(true);
    try {
      let photoUrl = editingTripOriginalPhoto;

      if (editImageMode === 'clear') {
        photoUrl = '';
      }

      if (editImageMode === 'replace') {
        const existingImages = parseTripImages(editingTripOriginalPhoto);
        const imageBase64List = editTripFiles.length > 0 ? await filesToBase64Array(editTripFiles) : [];
        const mergedImages = [...existingImages, ...imageBase64List];

        if (mergedImages.length > MAX_UPLOAD_IMAGE_COUNT) {
          throw new Error(`当前足迹最多可保存 ${MAX_UPLOAD_IMAGE_COUNT} 张图片，请先清空图片或减少新增数量`);
        }

        photoUrl = mergedImages.length > 0 ? JSON.stringify(mergedImages) : '';
      }

      const result = await updateTrip({
        id: editingTripId,
        userId,
        name: trimmedName,
        note: editTripNote.trim(),
        category: editTripCategory,
        photoUrl,
      });

      if (result.ok) {
        showNotice('足迹已更新');
        closeEditTripForm();
      } else {
        showNotice(result.message || '修改失败，请检查后端连接');
      }
    } catch (error) {
      console.error('修改失败:', error);
      showNotice(getErrorMessage(error, '数据库连接失败，请检查后端'));
    } finally {
      setEditTripSaving(false);
    }
  };

  const focusMyLocation = () => {
    if (!mapInstance) return;

    if (myPosition) {
      mapInstance.flyTo(myPosition, Math.max(mapInstance.getZoom(), 15), { duration: 0.8 });
      setLocatePulse(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const current = toMapPosition(pos.coords.latitude, pos.coords.longitude, useGcjOffset);
        setMyPosition(current);
        mapInstance.flyTo(current, 16, { duration: 0.8 });
        setLocatePulse(true);
      },
      () => {
        showNotice('暂时无法获取当前位置，请检查定位权限');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const focusByResult = (result: SearchResult) => {
    if (!mapInstance) return;
    const lat = Number(result.lat);
    const lon = Number(result.lon);
    const target = toMapPosition(lat, lon, useGcjOffset);
    mapInstance.flyTo(target, SEARCH_FOCUS_ZOOM, { duration: 0.9 });
    setSearchHintPosition(target);
    setSearchQuery(result.display_name);
    setSearchResults([]);
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    try {
      let searchUrl = `${API_BASE_URL}/api/search/places?q=${encodeURIComponent(query)}&limit=8`;
      if (myPosition) {
        searchUrl += `&lat=${myPosition[0]}&lng=${myPosition[1]}`;
      }
      const response = await fetch(searchUrl, { method: 'GET', cache: 'no-store' });
      if (!response.ok) {
        setSearchResults([]);
        const errorData = await response.json().catch(() => ({}));
        showNotice(errorData.error || '搜索服务暂时不可用，请稍后重试');
        return;
      }

      const results = (await response.json()) as SearchResult[];
      setSearchResults(results);

      if (results.length > 0 && mapInstance) {
        const first = results[0];
        const target = toMapPosition(Number(first.lat), Number(first.lon), useGcjOffset);
        mapInstance.flyTo(target, SEARCH_FOCUS_ZOOM, { duration: 0.9 });
        setSearchHintPosition(target);
      }
    } catch (error) {
      console.error('搜索地点失败:', error);
      setSearchResults([]);
      showNotice('网络异常，暂时无法搜索地点');
    }
  };

  const editingTripOriginalImages = parseTripImages(editingTripOriginalPhoto);
  const editTripHasImages = editingTripOriginalImages.length > 0;

  return (
    <div className={`map-fullscreen relative ${darkMode ? 'dark-mode-active' : ''}`}>
      {showOldBrowserTip && (
        <div className="absolute left-0 right-0 top-0 z-[2000] bg-amber-50 border-b border-amber-200 px-4 py-3 text-center">
          <p className="text-sm text-amber-800">
            你的浏览器内核较旧，可能无法正常显示地图或保存较慢。
            推荐使用 <b>夸克浏览器</b> 或 <b>Chrome</b> 获得最佳体验。
          </p>
          <button onClick={() => setShowOldBrowserTip(false)}
            className="mt-1 text-xs text-amber-600 underline">关闭提示</button>
        </div>
      )}
      <style jsx global>{`
        .leaflet-div-icon.saved-trip-div-icon,
        .leaflet-div-icon.custom-div-icon {
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
        }

        .animate-pulse.saved-trip-pin {
          animation: saved-trip-breathe 2.3s ease-in-out infinite;
        }

        .saved-trip-pin {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          transform: translateZ(0);
        }

        .saved-trip-pin-shell {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 9999px;
          background: rgba(99, 102, 241, 0.2);
          border: 1px solid rgba(99, 102, 241, 0.45);
          box-shadow: 0 8px 20px rgba(67, 56, 202, 0.2);
        }

        .saved-trip-map-pin {
          color: #4338ca;
          filter: drop-shadow(0 1px 1px rgba(49, 46, 129, 0.22));
        }

        .saved-trip-pin-core {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          background: #312e81;
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.72);
        }

        @keyframes saved-trip-breathe {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.96;
          }
          50% {
            transform: scale(1.08);
            opacity: 0.78;
          }
        }
        .dark-mode-active .leaflet-tile {
          filter: invert(0.92) hue-rotate(180deg) brightness(0.85) saturate(0.6);
        }
        .dark-mode-active .leaflet-container {
          background: #1a1a1a;
        }
        .dark-mode-active .bg-white,
        .dark-mode-active .bg-white\/90,
        .dark-mode-active .bg-white\/95,
        .dark-mode-active .bg-white\/55 {
          background: #1e2a1e !important;
          border-color: #2d3d2d !important;
          color: #c8d6c8 !important;
        }
        .dark-mode-active .text-slate-800,
        .dark-mode-active .text-slate-700 {
          color: #c8d6c8 !important;
        }
        .dark-mode-active .bg-slate-100 {
          background: #2d3d2d !important;
          color: #b0c0b0 !important;
        }
        .dark-mode-active .border-slate-200,
        .dark-mode-active .border-slate-300,
        .dark-mode-active .border-b {
          border-color: #2d3d2d !important;
        }
        .dark-mode-active input,
        .dark-mode-active textarea {
          background: #2d3d2d !important;
          color: #c8d6c8 !important;
          border-color: #3d4d3d !important;
        }
        .dark-mode-active .bg-\[\\#7E9D82\] {
          background: #3d6b4a !important;
        }
        .dark-mode-active .hover\\:bg-\[\\#6F8B73\]\\:hover {
          background: #2d5a3a !important;
        }
      `}</style>

      <MapSearchBar
        searchQuery={searchQuery}
        searchResults={searchResults}
        onSearchQueryChange={setSearchQuery}
        onSearch={handleSearch}
        onSelectResult={focusByResult}
      />

      {/* 登录UI */}
      <LoginPanel
        apiBaseUrl={API_BASE_URL}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
        isLoggedIn={isLoggedIn}
        userName={userName}
        avatar={avatar}
        sendCode={sendCode}
        register={register}
        login={login}
        resetPassword={resetPassword}
        updateProfile={updateProfile}
      />

      <TripCreateDialog
        open={tripFormOpen}
        tripName={tripName}
        tripNote={tripNote}
        tripFiles={tripFiles}
        tripCategory={tripCategory}
        tripSaving={tripSaving}
        onClose={closeTripForm}
        onTripNameChange={setTripName}
        onTripNoteChange={setTripNote}
        onTripCategoryChange={setTripCategory}
        onTripFilesChange={setTripFiles}
        onSubmit={submitTripForm}
      />

      <TripEditDialog
        open={editTripOpen}
        editTripName={editTripName}
        editTripNote={editTripNote}
        editTripFiles={editTripFiles}
        editTripCategory={editTripCategory}
        editTripSaving={editTripSaving}
        editTripHasImages={editTripHasImages}
        existingImageCount={editingTripOriginalImages.length}
        maxImageCount={MAX_UPLOAD_IMAGE_COUNT}
        editImageMode={editImageMode}
        onClose={closeEditTripForm}
        onEditTripNameChange={setEditTripName}
        onEditTripNoteChange={setEditTripNote}
        onEditTripCategoryChange={setEditTripCategory}
        onEditTripFilesChange={setEditTripFiles}
        onEditImageModeChange={setEditImageMode}
        onSubmit={submitEditTripForm}
      />

      <MapContainer 
        center={defaultCenter} 
        zoom={13} 
        minZoom={3}
        maxZoom={18}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <MapInstanceBridge onMapReady={setMapInstance} />
        <TileLayer
          url="https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}"
          subdomains={['1', '2', '3', '4']}
          minZoom={3}
          maxZoom={18}
          attribution='&copy; <a href="https://ditu.amap.com/">Amap</a>'
        />
        
        {/* 点击保存逻辑 */}
        <MapClickHandler onMapClick={handleMapTripClick} userId={userId} onNotice={showNotice} />

        {/* 搜索定位提示点（短暂显示） */}
        {searchHintPosition && (
          <Marker position={searchHintPosition} icon={searchHintIcon}>
            <Popup>已定位到搜索位置</Popup>
          </Marker>
        )}

        {/* 实时定位逻辑 */}
        <LiveLocationTracker onOthersUpdate={setOthers} onMyPositionUpdate={setMyPosition} onMyAccuracyUpdate={setMyAccuracy} useGcjOffset={useGcjOffset} shareEnabled={isSharingEnabled} groupCode={groupCode} currentUserName={userName} currentUserId={userId} />

        {/* 聚类足迹标记 */}
        <TripMarkers
          trips={savedTrips}
          onEdit={openEditTripForm}
          onDelete={requestDeleteTrip}
          onImageClick={openImagePreview}
        />

        {/* 渲染：Socket.io 在线其他用户 */}
        {Object.keys(others).map((id) => {
          if (id === socket.id) return null;
          const { lat, lng, userName: otherUserName } = others[id];
          const color = getColorForId(id);
          return (
            <Marker key={`live-${id}`} position={[lat, lng]} icon={createColoredIcon(color)}>
              <Popup>
                <div className="font-bold text-blue-600">{otherUserName || '神秘游民'}</div>
                <div className="text-xs text-gray-400">正在实时共享位置</div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* 黑夜模式切换 */}
      <button
        type="button"
        onClick={() => {
          const next = !darkMode;
          setDarkMode(next);
          localStorage.setItem('darkMode', next ? '1' : '0');
        }}
        className="absolute bottom-6 left-4 z-[1000] flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm hover:bg-white transition-colors"
        title={darkMode ? '切换日间模式' : '切换夜间模式'}
      >
        {darkMode ? '☀️' : '🌙'}
      </button>

      {/* 高德地图版权标识 */}
      <div className="absolute bottom-1 right-1 z-[1000]">
        <span className="rounded bg-white/70 px-1.5 py-0.5 text-[9px] text-slate-400 backdrop-blur-sm">
          &copy; <a href="https://ditu.amap.com/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600">高德地图</a>
        </span>
      </div>

      <BottomControlBar
        groupCode={groupCode}
        isSharingEnabled={isSharingEnabled}
        locatePulse={locatePulse}
        myAccuracy={myAccuracy}
        onToggleGroupPanel={() => setGroupPanelOpen((prev) => !prev)}
        onToggleSharing={toggleSharing}
        onFocusMyLocation={focusMyLocation}
      />

      <GroupInvitePanel
        open={groupPanelOpen}
        groupCode={groupCode}
        groupCodeInput={groupCodeInput}
        joinDialogOpen={joinGroupDialogOpen}
        copyHintMessage={copyHintMessage}
        onClosePanel={() => setGroupPanelOpen(false)}
        onCopyCode={copyGroupCode}
        onOpenChat={() => {
          setChatOpen(true);
          setGroupPanelOpen(false);
        }}
        onCreateGroup={createGroup}
        onLeaveGroup={leaveGroup}
        onOpenJoinDialog={() => {
          setJoinGroupDialogOpen(true);
          setGroupCodeInput('');
        }}
        onCloseJoinDialog={() => setJoinGroupDialogOpen(false)}
        onGroupCodeInputChange={setGroupCodeInput}
        onJoinGroup={joinGroupByCode}
      />

      <GroupChatPanel
        open={chatOpen}
        groupCode={groupCode}
        userName={userName}
        chatMessages={chatMessages}
        chatInput={chatInput}
        chatSending={chatSending}
        chatHasMore={chatHasMore}
        chatLoadingMore={chatLoadingMore}
        groupMembers={groupMembers}
        chatListRef={chatListRef}
        onClose={() => setChatOpen(false)}
        onChatInputChange={setChatInput}
        onSend={sendGroupMessage}
        onLoadMore={() => {
          void loadOlderChatMessages();
        }}
      />

      <NoticeDialog
        open={Boolean(noticeMessage)}
        message={noticeMessage}
        copyValue={noticeCopyValue}
        onCopyValue={(value) => {
          void (async () => {
            const copied = await copyTextToClipboard(value);
            setCopyHintMessage(copied ? '邀请码已复制' : '复制失败，请手动复制邀请码');
            setNoticeMessage(null);
            setNoticeCopyValue(null);
            setGroupPanelOpen(true);
          })();
        }}
        onClose={() => {
          setNoticeMessage(null);
          setNoticeCopyValue(null);
        }}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="确认删除"
        message="确定要永久删除这个足迹吗？"
        confirmText="删除"
        cancelText="取消"
        confirmDisabled={deleteSubmitting}
        onConfirm={() => {
          void confirmDeleteTrip();
        }}
        onCancel={() => {
          if (deleteSubmitting) return;
          setDeleteConfirmOpen(false);
          setPendingDeleteTripId(null);
        }}
      />

      <ImagePreviewOverlay
        activePreview={activePreview}
        previewImagesLength={previewImages.length}
        previewIndex={previewIndex}
        previewControlsVisible={previewControlsVisible}
        previewControlStyle={previewControlStyle}
        onClose={closeImagePreview}
        onRevealControls={revealPreviewControls}
        onPrev={showPreviousPreview}
        onNext={showNextPreview}
      />
    </div>
  );
}
