import { useEffect, useState } from 'react';

type TripCreatePayload = {
  name: string;
  note: string;
  photoUrl: string;
  lat: number;
  lng: number;
  userId: string;
};

type TripUpdatePayload = {
  id: number;
  userId: string;
  name: string;
  note: string;
  photoUrl: string;
};

export function useTrip(apiBaseUrl: string, userId: string | null) {
  const [savedTrips, setSavedTrips] = useState<any[]>([]);

  const fetchSavedTrips = async (targetUserId = userId) => {
    if (!targetUserId) return;
    try {
      const response = await fetch(`${apiBaseUrl}/api/trips?userId=${targetUserId}`);
      if (response.ok) {
        const data = await response.json();
        setSavedTrips(data);
      } else {
        console.error('加载足迹失败，HTTP 状态码:', response.status);
      }
    } catch (err) {
      console.error('加载 MySQL 足迹失败:', err);
    }
  };

  useEffect(() => {
    if (userId) {
      void fetchSavedTrips(userId);
    } else {
      setSavedTrips([]);
    }
  }, [userId]);

  const createTrip = async (payload: TripCreatePayload) => {
    const response = await fetch(`${apiBaseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      await fetchSavedTrips(payload.userId);
      return { ok: true as const };
    }

    if (response.status === 413) {
      return { ok: false as const, message: '保存失败：图片过大，请减少图片数量或压缩后重试' };
    }

    const errorData = await response.json().catch(() => ({}));
    return {
      ok: false as const,
      message: errorData.error ? `保存失败：${errorData.error}` : `保存失败（HTTP ${response.status}）`,
    };
  };

  const updateTrip = async (payload: TripUpdatePayload) => {
    const response = await fetch(`${apiBaseUrl}/api/trips/${payload.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: payload.name,
        note: payload.note,
        photoUrl: payload.photoUrl,
        userId: payload.userId,
      }),
    });

    if (response.ok) {
      await fetchSavedTrips(payload.userId);
      return { ok: true as const };
    }

    if (response.status === 413) {
      return { ok: false as const, message: '修改失败：图片过大，请减少图片数量或压缩后重试' };
    }

    const errorData = await response.json().catch(() => ({}));
    return {
      ok: false as const,
      message: errorData.error ? `修改失败：${errorData.error}` : `修改失败（HTTP ${response.status}）`,
    };
  };

  const removeTrip = async (id: number) => {
    const response = await fetch(`${apiBaseUrl}/api/trips/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      await fetchSavedTrips();
      return { ok: true as const };
    }

    return { ok: false as const, message: '删除失败，请检查后端连接' };
  };

  const clearTrips = () => {
    setSavedTrips([]);
  };

  return {
    savedTrips,
    fetchSavedTrips,
    createTrip,
    updateTrip,
    removeTrip,
    clearTrips,
  };
}
