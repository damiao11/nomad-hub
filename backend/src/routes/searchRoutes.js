const DEFAULT_SEARCH_LIMIT = 8;
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';
const PHOTON_BASE_URL = 'https://photon.komoot.io/api/';

const LOCAL_CITY_FALLBACKS = [
  { name: '北京', lat: 39.9042, lon: 116.4074, aliases: ['beijing', 'bj'] },
  { name: '上海', lat: 31.2304, lon: 121.4737, aliases: ['shanghai', 'sh'] },
  { name: '广州', lat: 23.1291, lon: 113.2644, aliases: ['guangzhou', 'gz'] },
  { name: '深圳', lat: 22.5431, lon: 114.0579, aliases: ['shenzhen', 'sz'] },
  { name: '杭州', lat: 30.2741, lon: 120.1551, aliases: ['hangzhou', 'hz'] },
  { name: '宁波', lat: 29.8683, lon: 121.544, aliases: ['ningbo'] },
  { name: '嘉兴', lat: 30.7522, lon: 120.7555, aliases: ['jiaxing'] },
  { name: '湖州', lat: 30.8931, lon: 120.0868, aliases: ['huzhou'] },
  { name: '绍兴', lat: 30.0303, lon: 120.5853, aliases: ['shaoxing'] },
  { name: '金华', lat: 29.0792, lon: 119.6474, aliases: ['jinhua'] },
  { name: '温州', lat: 27.9949, lon: 120.6994, aliases: ['wenzhou'] },
  { name: '台州', lat: 28.6564, lon: 121.4208, aliases: ['taizhou-zj', 'taizhou'] },
  { name: '舟山', lat: 29.9853, lon: 122.2072, aliases: ['zhoushan'] },
  { name: '南京', lat: 32.0603, lon: 118.7969, aliases: ['nanjing', 'nj'] },
  { name: '苏州', lat: 31.2989, lon: 120.5853, aliases: ['suzhou', 'szhou'] },
  { name: '无锡', lat: 31.4912, lon: 120.3119, aliases: ['wuxi'] },
  { name: '常州', lat: 31.8107, lon: 119.9741, aliases: ['changzhou'] },
  { name: '武汉', lat: 30.5928, lon: 114.3055, aliases: ['wuhan'] },
  { name: '成都', lat: 30.5728, lon: 104.0668, aliases: ['chengdu', 'cd'] },
  { name: '重庆', lat: 29.563, lon: 106.5516, aliases: ['chongqing', 'cq'] },
  { name: '西安', lat: 34.3416, lon: 108.9398, aliases: ['xian'] },
  { name: '天津', lat: 39.0842, lon: 117.2009, aliases: ['tianjin', 'tj'] },
  { name: '青岛', lat: 36.0671, lon: 120.3826, aliases: ['qingdao'] },
  { name: '厦门', lat: 24.4798, lon: 118.0894, aliases: ['xiamen'] },
  { name: '福州', lat: 26.0745, lon: 119.2965, aliases: ['fuzhou'] },
  { name: '济南', lat: 36.6512, lon: 117.12, aliases: ['jinan'] },
  { name: '郑州', lat: 34.7466, lon: 113.6254, aliases: ['zhengzhou'] },
  { name: '长沙', lat: 28.2282, lon: 112.9388, aliases: ['changsha'] },
  { name: '南昌', lat: 28.6829, lon: 115.8582, aliases: ['nanchang'] },
  { name: '合肥', lat: 31.8206, lon: 117.2272, aliases: ['hefei'] },
  { name: '昆明', lat: 25.0389, lon: 102.7183, aliases: ['kunming'] },
  { name: '贵阳', lat: 26.647, lon: 106.6302, aliases: ['guiyang'] },
  { name: '南宁', lat: 22.817, lon: 108.3669, aliases: ['nanning'] },
  { name: '海口', lat: 20.044, lon: 110.1983, aliases: ['haikou'] },
  { name: '哈尔滨', lat: 45.8038, lon: 126.5349, aliases: ['haerbin', 'harbin'] },
  { name: '沈阳', lat: 41.8057, lon: 123.4315, aliases: ['shenyang'] },
  { name: '长春', lat: 43.8171, lon: 125.3235, aliases: ['changchun'] },
  { name: '大连', lat: 38.914, lon: 121.6147, aliases: ['dalian'] },
  { name: '乌鲁木齐', lat: 43.8256, lon: 87.6168, aliases: ['wulumuqi', 'urumqi'] },
  { name: '拉萨', lat: 29.6525, lon: 91.1721, aliases: ['lasa', 'lhasa'] },
];

const parseLimit = (value) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SEARCH_LIMIT;
  }
  return Math.min(parsed, 20);
};

const mapNominatimResult = (item) => ({
  place_id: item.place_id,
  lat: item.lat,
  lon: item.lon,
  display_name: item.display_name,
  type: item.type,
  class: item.class,
});

const mapPhotonResult = (feature, index) => {
  const coordinates = feature?.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const lon = Number(coordinates[0]);
  const lat = Number(coordinates[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  const p = feature?.properties || {};
  const title = p.name || p.city || p.country || '未知地点';
  const segments = [p.city, p.state, p.country].filter(Boolean);
  const suffix = segments.length > 0 ? ` (${segments.join(' / ')})` : '';

  return {
    place_id: Number(p.osm_id || 900000 + index),
    lat: String(lat),
    lon: String(lon),
    display_name: `${title}${suffix}`,
    type: p.type || 'place',
    class: p.osm_key || 'place',
  };
};

const withTimeout = async (url, headers, timeoutMs) => {
  if (typeof fetch !== 'function') {
    throw new Error('fetch-unavailable');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`status-${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
};

const searchLocalFallback = (query, limit, userLat, userLng) => {
  const lower = query.trim().toLowerCase();
  if (!lower) return [];

  const hasLocation = Number.isFinite(userLat) && Number.isFinite(userLng);

  let matches = LOCAL_CITY_FALLBACKS
    .filter((item) => item.name.includes(query) || item.aliases.some((alias) => alias.includes(lower)));

  // 有用户位置时按距离排序
  if (hasLocation) {
    matches = matches.sort((a, b) => {
      return haversineKm(userLat, userLng, a.lat, a.lon) - haversineKm(userLat, userLng, b.lat, b.lon);
    });
  }

  return matches.slice(0, limit)
    .map((item, index) => ({
      place_id: 1000000 + index,
      lat: String(item.lat),
      lon: String(item.lon),
      display_name: `${item.name}（本地兜底）`,
      type: 'city',
      class: 'boundary',
    }));
};

const registerSearchRoutes = (app) => {
  // Haversine 距离计算（公里）
  const haversineKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  app.get('/api/search/places', async (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const limit = parseLimit(req.query.limit);
    const userLat = Number(req.query.lat);
    const userLng = Number(req.query.lng);
    const hasLocation = Number.isFinite(userLat) && Number.isFinite(userLng);

    if (!query) {
      return res.status(400).json({ error: '搜索关键词不能为空' });
    }

    try {
      const nominatimParams = new URLSearchParams({
        format: 'jsonv2',
        q: query,
        limit: String(limit),
        addressdetails: '0',
      });
      // 有用户位置时限制搜索范围
      if (hasLocation) {
        nominatimParams.set('viewbox', `${userLng - 2},${userLat - 1},${userLng + 2},${userLat + 1}`);
        nominatimParams.set('bounded', '0');
      }
      const nominatimPayload = await withTimeout(
        `${NOMINATIM_BASE_URL}?${nominatimParams.toString()}`,
        {
          Accept: 'application/json',
          'User-Agent': 'NomadMap/1.0 (contact: local-dev)',
        },
        8000
      );

      let nominatimResults = Array.isArray(nominatimPayload) ? nominatimPayload.map(mapNominatimResult) : [];

      // 有用户位置时按距离排序
      if (hasLocation && nominatimResults.length > 0) {
        nominatimResults = nominatimResults.sort((a, b) => {
          return haversineKm(userLat, userLng, Number(a.lat), Number(a.lon))
               - haversineKm(userLat, userLng, Number(b.lat), Number(b.lon));
        });
      }

      if (nominatimResults.length > 0) {
        return res.json(nominatimResults);
      }
    } catch (error) {
      console.warn('[search] nominatim failed:', error?.message || error);
    }

    try {
      const photonParams = new URLSearchParams({
        q: query,
        limit: String(limit),
      });
      const photonPayload = await withTimeout(
        `${PHOTON_BASE_URL}?${photonParams.toString()}`,
        {
          Accept: 'application/json',
          'User-Agent': 'NomadMap/1.0 (contact: local-dev)',
        },
        5000
      );

      const features = Array.isArray(photonPayload?.features) ? photonPayload.features : [];
      let photonResults = features
        .map((feature, index) => mapPhotonResult(feature, index))
        .filter(Boolean);

      // 有用户位置时按距离排序
      if (hasLocation && photonResults.length > 0) {
        photonResults = photonResults.sort((a, b) => {
          return haversineKm(userLat, userLng, Number(a.lat), Number(a.lon))
               - haversineKm(userLat, userLng, Number(b.lat), Number(b.lon));
        });
      }

      if (photonResults.length > 0) {
        return res.json(photonResults);
      }
    } catch (error) {
      console.warn('[search] photon failed:', error?.message || error);
    }

    const localResults = searchLocalFallback(query, limit, userLat, userLng);
    if (localResults.length > 0) {
      return res.json(localResults);
    }

    return res.status(502).json({ error: '在线搜索不可用，可尝试输入城市名（如 杭州 / 上海）' });
  });
};

module.exports = {
  registerSearchRoutes,
};
