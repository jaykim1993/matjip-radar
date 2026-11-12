// 종합점수 모델 — 반경 안 후보들 사이의 "상대 점수"(0~100)
// 평점(리뷰 수 보정) · 리뷰 수(인기도) · 거리

export const WEIGHTS = { rating: 0.5, popular: 0.3, near: 0.2 };

// 리뷰가 이 정도 쌓이기 전에는 평점을 후보 평균 쪽으로 당김 (베이지안 평균)
const PRIOR_REVIEWS = 30;
export const LOW_DATA_REVIEWS = 10;

// 가격대: Google priceRange(1인 기준 원화 범위)의 최저가로 4단계
// 1: 1만원 미만, 2: 1만원대, 3: 2만원대, 4: 3만원 이상
// priceRange가 없으면 priceLevel로 대략 추정
const LEVEL_TIER = {
  PRICE_LEVEL_FREE: 1,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 4,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

const won = (m) => (m?.units != null && (!m.currencyCode || m.currencyCode === 'KRW') ? Number(m.units) : null);
const man = (n) => (n % 10000 === 0 ? `${n / 10000}만` : `${(n / 10000).toFixed(1)}만`);

export function priceInfo(priceRange, priceLevel) {
  const lo = won(priceRange?.startPrice);
  const hi = won(priceRange?.endPrice);
  if (lo != null || hi != null) {
    const min = lo ?? 0;
    const tier = min < 10000 ? 1 : min < 20000 ? 2 : min < 30000 ? 3 : 4;
    let label;
    if (hi == null) label = `${man(min)}원~`;
    else if (min <= 1) label = `${man(hi)}원 이하`;
    else label = `${man(min).replace('만', '')}~${man(hi)}원`;
    return { price: tier, priceLabel: label };
  }
  return { price: LEVEL_TIER[priceLevel] ?? null, priceLabel: null };
}

export function adjustedRating(rating, count, prior) {
  if (!rating || !count) return prior;
  return (count / (count + PRIOR_REVIEWS)) * rating + (PRIOR_REVIEWS / (count + PRIOR_REVIEWS)) * prior;
}

export function scorePlaces(places, radius) {
  const rated = places.filter((p) => p.rating && p.reviewCount);
  // 후보들의 리뷰 수 가중 평균 평점 (없으면 4.0)
  const totalReviews = rated.reduce((a, p) => a + p.reviewCount, 0);
  const prior = totalReviews ? rated.reduce((a, p) => a + p.rating * p.reviewCount, 0) / totalReviews : 4.0;

  // 평점이 없는 곳은 평점 점수 0 (거리·리뷰 수로만 순위)
  const adj = places.map((p) => (p.rating && p.reviewCount ? adjustedRating(p.rating, p.reviewCount, prior) : null));
  const known = adj.filter((x) => x != null);
  const lo = known.length ? Math.min(...known) : 0;
  const hi = known.length ? Math.max(...known) : 0;
  const maxCount = Math.max(1, ...places.map((p) => p.reviewCount || 0));
  const clamp = (x) => Math.max(0, Math.min(1, x));

  return places
    .map((p, i) => {
      const parts = {
        // 평점은 4.0~4.6에 몰려 있어 후보 안에서 min-max로 펼침
        rating: adj[i] == null ? 0 : hi > lo ? (adj[i] - lo) / (hi - lo) : 0.5,
        popular: Math.log1p(p.reviewCount || 0) / Math.log1p(maxCount),
        near: clamp(1 - (p.distance || 0) / radius),
      };
      const score = Math.round(100 * (WEIGHTS.rating * parts.rating + WEIGHTS.popular * parts.popular + WEIGHTS.near * parts.near));
      return {
        ...p,
        adjustedRating: adj[i] == null ? null : Math.round(adj[i] * 100) / 100,
        lowData: (p.reviewCount || 0) < LOW_DATA_REVIEWS,
        score,
        parts,
      };
    })
    .sort((a, b) => b.score - a.score);
}
