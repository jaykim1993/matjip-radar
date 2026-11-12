import type { LatLng, NearbyResponse, PlaceDetail, PlaceType } from './types';

// 앱(기기)에서는 localhost가 기기 자신을 가리키므로 PC의 LAN IP나 배포 주소를 넣으세요.
// 예) EXPO_PUBLIC_API_URL=http://192.168.0.12:3000
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`${API_URL}${path}`, { signal });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new Error(`서버(${API_URL})에 연결하지 못했어요. 서버가 켜져 있는지, 주소가 맞는지 확인하세요.`);
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || '정보를 불러오지 못했어요.');
  return j as T;
}

function areaParams(pos: LatLng, radius: number, type: PlaceType) {
  return new URLSearchParams({ lat: pos.lat.toFixed(5), lng: pos.lng.toFixed(5), radius: String(radius), type });
}

/** query가 있으면 키워드 검색, 없으면 주변 인기 가게 */
export function fetchPlaces(pos: LatLng, radius: number, type: PlaceType, query: string, signal?: AbortSignal) {
  const q = areaParams(pos, radius, type);
  if (query) q.set('q', query);
  return getJson<NearbyResponse>(`/api/nearby?${q}`, signal);
}

/** 같은 조건으로 최대 20곳 더 (서버가 기존 목록과 합쳐서 돌려줌) */
export function fetchMore(pos: LatLng, radius: number, type: PlaceType, query: string) {
  const q = areaParams(pos, radius, type);
  if (query) q.set('q', query);
  return getJson<NearbyResponse>(`/api/more?${q}`);
}

const detailCache = new Map<string, Promise<PlaceDetail>>();
export function fetchDetail(id: string): Promise<PlaceDetail> {
  let p = detailCache.get(id);
  if (!p) {
    p = getJson<PlaceDetail>(`/api/place/${encodeURIComponent(id)}`);
    p.catch(() => detailCache.delete(id));
    detailCache.set(id, p);
  }
  return p;
}

export const photoUrl = (name: string, width = 800) =>
  `${API_URL}/api/photo?name=${encodeURIComponent(name)}&w=${width}`;
