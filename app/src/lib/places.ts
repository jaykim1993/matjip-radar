import type { LatLng, Place, PriceTier, ShownPlace, SortKey } from './types';

export function haversine(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat);
  const dLng = toR(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const fmtDist = (m: number) => (m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`);
export const fmtNum = (n: number | null | undefined) => (n == null ? '–' : n.toLocaleString('ko-KR'));

export function filterAndSort(
  places: Place[],
  pos: LatLng,
  cats: Set<string>,
  prices: Set<PriceTier>,
  sort: SortKey,
  openOnly = false
): ShownPlace[] {
  let ps = places.map((p) => ({ ...p, dist: haversine(pos, p) }));
  if (cats.size) ps = ps.filter((p) => cats.has(p.cat));
  if (prices.size) ps = ps.filter((p) => p.price != null && prices.has(p.price));
  if (openOnly) ps = ps.filter((p) => p.openNow === true);
  const by: Record<SortKey, (a: ShownPlace, b: ShownPlace) => number> = {
    score: (a, b) => b.score - a.score,
    distance: (a, b) => a.dist - b.dist,
    rating: (a, b) => (b.adjustedRating ?? -1) - (a.adjustedRating ?? -1),
    reviews: (a, b) => b.reviewCount - a.reviewCount,
  };
  ps.sort(by[sort]);
  // 가게 이름으로 검색했으면 이름이 맞는 곳을 맨 위로 (종합점수 정렬일 때)
  if (sort === 'score') ps.sort((a, b) => Number(!!b.nameMatch) - Number(!!a.nameMatch));
  return ps;
}

export function categoryCounts(places: Place[]): [string, number][] {
  const m = new Map<string, number>();
  for (const p of places) m.set(p.cat, (m.get(p.cat) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]);
}

/** 점수가 높을수록 잘 뽑히는 랜덤 추천. 직전 추천은 제외 */
export function weightedPick<T extends { id: string; score: number }>(items: T[], excludeId?: string | null): T | null {
  if (!items.length) return null;
  const pool = items.length > 1 ? items.filter((p) => p.id !== excludeId) : items;
  const w = pool.map((p) => (p.score + 5) ** 2);
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= w[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export function placeLinks(p: Place) {
  const q = encodeURIComponent(p.name);
  return [
    p.googleUrl ? { label: 'Google 지도', url: p.googleUrl } : null,
    { label: '네이버 지도', url: `https://map.naver.com/p/search/${q}` },
    { label: '카카오맵', url: `https://map.kakao.com/?q=${q}` },
  ].filter(Boolean) as { label: string; url: string }[];
}
