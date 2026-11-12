export type LatLng = { lat: number; lng: number };

export type PlaceType = 'food' | 'cafe';
export type SortKey = 'score' | 'distance' | 'rating' | 'reviews';
/** 1: 1만원 미만, 2: 1만원대, 3: 2만원대, 4: 3만원 이상 (1인 최저가 기준) */
export type PriceTier = 1 | 2 | 3 | 4;

export type Weights = { rating: number; popular: number; near: number };
export type PartKey = keyof Weights;

export type Place = {
  id: string;
  name: string;
  /** 화면 카테고리 (한식, 일식, 카페 …) */
  cat: string;
  /** Google 장소 유형 이름 */
  typeLabel: string;
  address: string;
  lat: number;
  lng: number;
  distance: number;
  /** Google 평점 원값 (없으면 null) */
  rating: number | null;
  reviewCount: number;
  /** 리뷰 수로 보정한 평점 */
  adjustedRating: number | null;
  /** 리뷰가 적어 점수 신뢰도가 낮음 */
  lowData: boolean;
  price: PriceTier | null;
  /** 예: '1~2만원', '1만원 이하' */
  priceLabel: string | null;
  openNow: boolean | null;
  googleUrl: string;
  /** 검색 결과 중 반경 밖 가게 */
  outside?: boolean;
  /** 가게 이름이 검색어와 일치 (이름 검색이면 맨 위) */
  nameMatch?: boolean;
  score: number;
  parts: Weights;
};

export type NearbyResponse = {
  mode: 'live' | 'demo';
  radius: number;
  type: PlaceType;
  /** 키워드 검색일 때 검색어 */
  query?: string | null;
  /** "더 불러오기"로 더 가져올 수 있는지 */
  hasMore?: boolean;
  weights: Weights;
  fetchedAt: string;
  places: Place[];
};

/** 화면용: 현재 기준 위치로 다시 잰 거리 포함 */
export type ShownPlace = Place & { dist: number };

export type PlaceReview = { author: string; rating: number | null; when: string; text: string };
export type PlacePhoto = { name: string; author: string };

/** 카드를 펼칠 때 불러오는 상세 */
export type PlaceDetail = {
  id: string;
  /** Google 소개 문구 (없을 수 있음) */
  summary: string | null;
  todayHours: string | null;
  hours: string[];
  phone: string | null;
  reviews: PlaceReview[];
  photos: PlacePhoto[];
};
