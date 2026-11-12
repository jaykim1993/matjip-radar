// 동네맛집 레이더 API 서버 — 의존성 없음 (Node 18+)
// 웹·iOS·Android 앱이 모두 이 서버를 호출합니다. API 키는 서버에만 둡니다.
// GET /api/nearby?lat=&lng=&radius=1000&type=food|cafe
// GET /api/status

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scorePlaces, priceInfo, WEIGHTS } from './lib/score.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadDotEnv(path.join(__dirname, '.env'));

const env = process.env;
const PORT = Number(env.PORT) || 3000;
const GOOGLE_KEY = env.GOOGLE_PLACES_API_KEY;
const DEMO = env.DEMO === '1' || !GOOGLE_KEY;
// 1: 인기순 20곳(검색 1회) / 2: 인기순 + 가까운순 합쳐 최대 40곳(검색 2회)
const CALLS_PER_SEARCH = env.GOOGLE_CALLS_PER_SEARCH === '2' ? 2 : 1;
const CACHE_MINUTES = Number(env.CACHE_MINUTES) || 360;
// 카드를 펼칠 때 불러올 사진 수 (사진 1장 = Place Photos 1회 호출)
const PHOTOS_PER_PLACE = Math.min(Math.max(Number(env.PHOTOS_PER_PLACE) || 4, 0), 10);
// 웹 앱 주소. 여러 개면 쉼표로 구분, 비우면 모두 허용(개발용)
const CORS_ORIGINS = (env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const v = m[2].replace(/^['"]|['"]$/g, '');
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}

// ---------- 유틸 ----------
const cache = new Map();
async function cached(key, ttl, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < ttl) return hit.v;
  const v = await fn();
  cache.set(key, { t: Date.now(), v });
  return v;
}

function haversine(a, b) {
  const R = 6371000;
  const toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat);
  const dLng = toR(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Google 장소 유형 → 화면 카테고리
const CATEGORY = {
  korean_restaurant: '한식', korean_barbecue_restaurant: '고기·구이', barbecue_restaurant: '고기·구이',
  japanese_restaurant: '일식', sushi_restaurant: '일식', ramen_restaurant: '일식',
  chinese_restaurant: '중식',
  italian_restaurant: '양식', pizza_restaurant: '양식', french_restaurant: '양식', american_restaurant: '양식',
  steak_house: '양식', mediterranean_restaurant: '양식', spanish_restaurant: '양식', mexican_restaurant: '양식',
  hamburger_restaurant: '패스트푸드', fast_food_restaurant: '패스트푸드', sandwich_shop: '패스트푸드',
  chicken_restaurant: '치킨', seafood_restaurant: '해산물',
  vietnamese_restaurant: '아시아', thai_restaurant: '아시아', indian_restaurant: '아시아', asian_restaurant: '아시아',
  bar: '술집', pub: '술집', wine_bar: '술집', bar_and_grill: '술집',
  brunch_restaurant: '브런치', breakfast_restaurant: '브런치',
  vegetarian_restaurant: '채식', vegan_restaurant: '채식',
  cafe: '카페', coffee_shop: '카페', bakery: '베이커리', dessert_shop: '디저트', ice_cream_shop: '디저트',
  meal_takeaway: '포장·배달', meal_delivery: '포장·배달',
  family_restaurant: '패밀리 레스토랑', buffet_restaurant: '뷔페',
};

const FIELDS = [
  'places.id', 'places.displayName', 'places.shortFormattedAddress', 'places.location',
  'places.primaryType', 'places.primaryTypeDisplayName', 'places.googleMapsUri', 'places.types',
  // ↓ Enterprise 등급 필드 (월 1,000회 무료)
  'places.rating', 'places.userRatingCount', 'places.priceLevel', 'places.priceRange', 'places.currentOpeningHours.openNow',
].join(',');

const FRIENDLY = {
  400: 'Google Places 요청이 잘못됐어요. 서버 로그를 확인하세요.',
  403: 'Google API 키에 Places API (New) 사용 권한이 없거나 결제 계정이 연결되지 않았어요.',
  429: 'Google Places 할당량을 다 썼어요. 내일 다시 시도하거나 콘솔에서 할당량을 확인하세요.',
};

// ---------- Google Places (New) ----------
async function googleFetch(url, init, label) {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(10000) });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    const e = new Error(`${label} ${r.status}: ${body.slice(0, 300)}`);
    e.userMessage = FRIENDLY[r.status] || FRIENDLY[400];
    throw e;
  }
  return r.json();
}

function mapPlace(p, center) {
  const loc = { lat: p.location?.latitude, lng: p.location?.longitude };
  return {
    id: p.id,
    // 'OO맛집 | Best Korean BBQ …' 처럼 홍보 문구가 붙은 이름 정리
    name: (p.displayName?.text || '(이름 없음)').split(/\s*[|｜ㅣ]\s*/)[0].trim() || p.displayName?.text,
    cat: CATEGORY[p.primaryType] || p.primaryTypeDisplayName?.text || '기타',
    typeLabel: p.primaryTypeDisplayName?.text || '',
    address: p.shortFormattedAddress || '',
    lat: loc.lat,
    lng: loc.lng,
    distance: Math.round(haversine(center, loc)),
    rating: p.rating ?? null,
    reviewCount: p.userRatingCount ?? 0,
    ...priceInfo(p.priceRange, p.priceLevel),
    openNow: p.currentOpeningHours?.openNow ?? null,
    googleUrl: p.googleMapsUri || '',
  };
}

const TYPES = { cafe: ['cafe', 'coffee_shop', 'bakery', 'dessert_shop'], food: ['restaurant'] };

// 반경 안 주변 검색 (최대 20곳)
async function googleNearby(center, radius, type, rankPreference) {
  const j = await googleFetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': GOOGLE_KEY, 'X-Goog-FieldMask': FIELDS },
    body: JSON.stringify({
      includedTypes: TYPES[type],
      maxResultCount: 20,
      rankPreference,
      languageCode: 'ko',
      regionCode: 'KR',
      locationRestriction: { circle: { center: { latitude: center.lat, longitude: center.lng }, radius } },
    }),
  }, 'nearby');
  return (j.places || []).map((p) => mapPlace(p, center));
}

// 음식·카페 관련 장소인지 (검색어로 지하철역 같은 게 섞이는 것 방지)
const FOOD_TYPES = ['food', 'restaurant', 'cafe', 'coffee_shop', 'bakery', 'bar', 'meal_takeaway', 'meal_delivery', 'dessert_shop'];
const isFood = (p) => (p.types || []).some((t) => FOOD_TYPES.includes(t) || t.endsWith('_restaurant'));

// 키워드 검색. 1회 최대 20곳, 다음 페이지 토큰으로 최대 60곳
// - userQuery=false ("더 불러오기"용 '맛집'/'카페'): 반경 사각형 안 + 음식점/카페 유형만
// - userQuery=true, bias=false (사용자 검색 1차): 반경 사각형 안, 유형 제한 없이 음식 관련만
// - userQuery=true, bias=true (사용자 검색 2차): 위치는 '우선'만 → 반경 밖 가게 이름도 찾음
async function googleText(query, center, radius, type, pageToken = null, userQuery = false, bias = false) {
  const body = { textQuery: query, pageSize: 20, languageCode: 'ko', regionCode: 'KR' };
  if (bias) {
    body.locationBias = { circle: { center: { latitude: center.lat, longitude: center.lng }, radius: Math.min(radius, 50000) } };
  } else {
    const dLat = radius / 111320;
    const dLng = radius / (111320 * Math.cos((center.lat * Math.PI) / 180));
    body.locationRestriction = {
      rectangle: {
        low: { latitude: center.lat - dLat, longitude: center.lng - dLng },
        high: { latitude: center.lat + dLat, longitude: center.lng + dLng },
      },
    };
  }
  if (!userQuery) body.includedType = type === 'cafe' ? 'cafe' : 'restaurant';
  if (pageToken) body.pageToken = pageToken;
  const j = await googleFetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': GOOGLE_KEY, 'X-Goog-FieldMask': FIELDS + ',nextPageToken' },
    body: JSON.stringify(body),
  }, 'text');
  const raw = j.places || [];
  return { places: (userQuery ? raw.filter(isFood) : raw).map((p) => mapPlace(p, center)), nextPageToken: j.nextPageToken || null };
}

// 가게 상세: 소개, 영업시간, 전화, 리뷰 3개, 사진 목록 (카드를 펼칠 때만 호출)
const DETAIL_FIELDS = 'editorialSummary,regularOpeningHours.weekdayDescriptions,nationalPhoneNumber,reviews,photos';
async function googleDetail(id) {
  const d = await googleFetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}?languageCode=ko&regionCode=KR`,
    { headers: { 'X-Goog-Api-Key': GOOGLE_KEY, 'X-Goog-FieldMask': DETAIL_FIELDS } },
    'detail'
  );
  // Google weekdayDescriptions는 월요일부터, getDay()는 일요일=0
  const kstDay = new Date(Date.now() + 9 * 3600e3).getUTCDay();
  const hours = d.regularOpeningHours?.weekdayDescriptions || [];
  return {
    id,
    summary: d.editorialSummary?.text || null,
    todayHours: hours.length === 7 ? hours[(kstDay + 6) % 7] : null,
    hours,
    phone: d.nationalPhoneNumber || null,
    reviews: (d.reviews || []).slice(0, 3).map((r) => ({
      author: r.authorAttribution?.displayName || '익명',
      rating: r.rating ?? null,
      when: r.relativePublishTimeDescription || '',
      text: (r.text?.text || r.originalText?.text || '').replace(/\s+/g, ' ').trim(),
    })),
    photos: (d.photos || []).slice(0, PHOTOS_PER_PLACE).map((ph) => ({
      name: ph.name,
      author: ph.authorAttributions?.[0]?.displayName || '',
    })),
  };
}

// 사진: 키가 노출되지 않도록 서버가 Google에서 사진 주소를 받아 리다이렉트
async function googlePhotoUri(name, width) {
  const j = await googleFetch(
    `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${width}&skipHttpRedirect=true`,
    { headers: { 'X-Goog-Api-Key': GOOGLE_KEY } },
    'photo'
  );
  return j.photoUri;
}

// ---------- 데모 데이터 (API 키 없을 때) ----------
function demoPlaces(center, radius, type) {
  let seed = Math.floor(Math.abs(center.lat * 1000 + center.lng * 1000)) || 1;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const cats = type === 'cafe' ? ['카페', '베이커리', '디저트', '브런치'] : ['한식', '고기·구이', '일식', '중식', '양식', '술집', '아시아', '치킨', '해산물'];
  return Array.from({ length: 30 }, (_, i) => {
    const r = radius * Math.sqrt(rnd()) * 0.95;
    const th = rnd() * 2 * Math.PI;
    const loc = {
      lat: center.lat + (r * Math.cos(th)) / 111320,
      lng: center.lng + (r * Math.sin(th)) / (111320 * Math.cos((center.lat * Math.PI) / 180)),
    };
    const cat = cats[Math.floor(rnd() * cats.length)];
    const reviewCount = Math.floor(Math.exp(rnd() * 7.5));
    return {
      id: 'demo-' + i,
      name: `데모 ${cat} ${i + 1}호점`,
      cat, typeLabel: cat, address: '데모 주소', ...loc,
      distance: Math.round(haversine(center, loc)),
      rating: reviewCount ? Math.round((3.4 + rnd() * 1.6) * 10) / 10 : null,
      reviewCount,
      ...(() => {
        if (rnd() < 0.15) return { price: null, priceLabel: null };
        const lo = 10000 * Math.floor(rnd() * 4);
        return priceInfo({ startPrice: { units: String(lo || 1) }, endPrice: { units: String(lo + 10000 * (1 + Math.floor(rnd() * 3))) } });
      })(),
      openNow: rnd() < 0.75,
      googleUrl: '',
    };
  });
}

function demoDetail(id) {
  return {
    id,
    summary: '데모 데이터입니다. 실제 키를 넣으면 Google 소개 문구가 나옵니다.',
    todayHours: '오늘: 오전 11:00~오후 10:00',
    hours: [],
    phone: '02-000-0000',
    reviews: [
      { author: '데모 사용자', rating: 5, when: '2주 전', text: '양이 많고 반찬이 맛있어요. 저녁에는 웨이팅이 조금 있습니다.' },
      { author: '데모 사용자 2', rating: 4, when: '1달 전', text: '분위기 좋고 직원분들이 친절해요. 주차는 어렵습니다.' },
    ],
    photos: [],
  };
}

// ---------- 핸들러 ----------
function readCommon(q) {
  const lat = Number(q.get('lat'));
  const lng = Number(q.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    const e = new Error('위치 좌표가 올바르지 않아요.');
    e.status = 400; e.userMessage = e.message;
    throw e;
  }
  return {
    radius: Math.min(Math.max(Number(q.get('radius')) || 1000, 100), 5000),
    type: q.get('type') === 'cafe' ? 'cafe' : 'food',
    // 약 100m 격자로 묶어 캐시 → 같은 동네 재검색은 Google을 다시 부르지 않음
    center: { lat: Math.round(lat * 1000) / 1000, lng: Math.round(lng * 1000) / 1000 },
  };
}

// 지역별 목록 상태: 처음 목록 + "더 불러오기"로 붙인 결과 + 다음 페이지 토큰
// key = 검색어/좌표 격자/반경/종류. CACHE_MINUTES 동안 유지
const areas = new Map();
function getArea(key) {
  const a = areas.get(key);
  if (a && Date.now() - a.t < CACHE_MINUTES * 60e3) return a;
  areas.delete(key);
  return null;
}
function merge(area, list) {
  let added = 0;
  for (const p of list) if (!area.byId.has(p.id)) { area.byId.set(p.id, p); added++; }
  return added;
}
const MAX_TEXT_PAGES = 3; // Google Text Search는 최대 60곳(20 × 3)

function areaKey({ center, radius, type }, query) {
  return `${query ? 'q:' + query : 'near'}:${center.lat},${center.lng},${radius},${type}`;
}

// 가게 이름 검색인지 판단: 이름이 검색어와 같거나 검색어로 시작(3글자 이상)할 때만
// '횟집', '곱창' 같은 메뉴·업종 단어는 이름 검색으로 보지 않음 → 점수 순 그대로
const norm = (x) => String(x || '').toLowerCase().replace(/[\s·.,'"()\-]/g, '');
const SEARCH_MAX_DISTANCE = 20000;
function isNameHit(name, q) {
  const n = norm(name);
  if (!q || !n) return false;
  return n === q || (q.length >= 3 && n.startsWith(q)) || (n.length >= 3 && q.includes(n));
}

function result(area, { radius, type }, query) {
  const q = norm(query);
  const places = [...area.byId.values()]
    .map((p) => ({ ...p, outside: p.distance > radius, nameMatch: isNameHit(p.name, q) }))
    // 반경 안만 보여주되, 가게 이름으로 찾은 곳은 반경 밖(20km 이내)도 포함
    .filter((p) => !p.outside || (p.nameMatch && p.distance <= SEARCH_MAX_DISTANCE));
  return {
    mode: DEMO ? 'demo' : 'live',
    radius,
    type,
    query: query || null,
    hasMore: area.pages < MAX_TEXT_PAGES && (area.pages === 0 || !!area.token),
    weights: WEIGHTS,
    fetchedAt: new Date(area.t).toISOString(),
    // 거리 점수는 반경 기준 (반경 밖은 0점)
    places: scorePlaces(places, radius),
  };
}

function readQuery(q) {
  return (q.get('q') || '').trim().slice(0, 60);
}

// 주변 목록 (Nearby Search, 인기순 20곳) 또는 검색 (Text Search 첫 페이지)
async function handleList(q) {
  const params = readCommon(q);
  const query = readQuery(q);
  const key = areaKey(params, query);
  let area = getArea(key);
  if (!area) {
    area = { t: Date.now(), byId: new Map(), token: null, pages: 0 };
    const { center, radius, type } = params;
    if (DEMO) {
      const demo = demoPlaces(center, radius, type);
      merge(area, query ? demo.filter((_, i) => i % 3 === 0).map((p) => ({ ...p, name: `${query} ${p.name}` })) : demo.slice(0, 20));
      area.demoRest = query ? [] : demo.slice(20);
      if (query) area.pages = MAX_TEXT_PAGES;
    } else if (query) {
      // 1차: 반경 안에서 검색
      const r = await googleText(query, center, radius, type, null, true, false);
      merge(area, r.places);
      area.token = r.nextPageToken;
      area.pages = 1;
      // 2차: 반경 안 결과가 적으면 가게 이름일 수 있으니 반경 밖까지 한 번 더 (Google 1회 추가)
      let extra = 0;
      if (r.places.length < 5) {
        const b = await googleText(query, center, radius, type, null, true, true);
        extra = merge(area, b.places);
      }
      console.log(`[google] 검색 "${query}" → 반경 안 ${r.places.length}곳${r.places.length < 5 ? `, 반경 밖 확장 +${extra}곳` : ''}`);
    } else {
      const ranks = CALLS_PER_SEARCH === 2 ? ['POPULARITY', 'DISTANCE'] : ['POPULARITY'];
      const lists = await Promise.all(ranks.map((rp) => googleNearby(center, radius, type, rp)));
      merge(area, lists.flat());
      console.log(`[google] 주변 ${center.lat},${center.lng} r=${radius} ${type} → ${area.byId.size}곳 (호출 ${ranks.length}회)`);
    }
    areas.set(key, area);
  }
  return result(area, params, query);
}

// "더 불러오기": Text Search 다음 페이지 (주변 목록이면 '맛집'/'카페'로 검색해 덧붙임). 1회 = Google 1회 호출
async function handleMore(q) {
  const params = readCommon(q);
  const query = readQuery(q);
  const key = areaKey(params, query);
  if (!getArea(key)) await handleList(q);
  const area = getArea(key);
  if (area.pages >= MAX_TEXT_PAGES || (area.pages > 0 && !area.token)) return result(area, params, query);

  if (DEMO) {
    merge(area, area.demoRest || []);
    area.demoRest = [];
    area.pages = MAX_TEXT_PAGES;
  } else {
    const { center, radius, type } = params;
    const text = query || (type === 'cafe' ? '카페' : '맛집');
    const r = await googleText(text, center, radius, type, area.token, !!query, false);
    const added = merge(area, r.places);
    area.token = r.nextPageToken;
    area.pages += 1;
    console.log(`[google] 더 불러오기 "${text}" ${area.pages}페이지 → 새로 ${added}곳`);
  }
  return result(area, params, query);
}

async function handleDetail(id) {
  if (!/^[A-Za-z0-9_-]{5,300}$/.test(id)) {
    const e = new Error('잘못된 가게 ID');
    e.status = 400; e.userMessage = e.message;
    throw e;
  }
  return cached('detail:' + id, 24 * 60 * 60e3, async () => (DEMO ? demoDetail(id) : googleDetail(id)));
}
// ---------- 서버 ----------
function cors(req, res) {
  const origin = req.headers.origin;
  if (!origin) return; // 네이티브 앱은 Origin 헤더가 없음
  if (!CORS_ORIGINS.length || CORS_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', CORS_ORIGINS.length ? origin : '*');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
}

function send(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

http
  .createServer(async (req, res) => {
    const u = new URL(req.url, 'http://localhost');
    cors(req, res);
    if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
    if (u.pathname === '/api/status') return send(res, 200, { mode: DEMO ? 'demo' : 'live' });
    const fail = (e) => {
      console.error(`[${u.pathname}]`, e.message);
      send(res, e.status === 400 ? 400 : 502, { error: e.userMessage || '정보를 불러오지 못했어요. 잠시 후 다시 시도하세요.' });
    };
    // /api/nearby?q= 가 있으면 검색, /api/search 는 예전 주소 호환
    if (u.pathname === '/api/nearby' || u.pathname === '/api/search') return handleList(u.searchParams).then((d) => send(res, 200, d), fail);
    if (u.pathname === '/api/more') return handleMore(u.searchParams).then((d) => send(res, 200, d), fail);
    const m = u.pathname.match(/^\/api\/place\/([^/]+)$/);
    if (m) return handleDetail(decodeURIComponent(m[1])).then((d) => send(res, 200, d), fail);
    if (u.pathname === '/api/photo') {
      const name = u.searchParams.get('name') || '';
      const w = Math.min(Math.max(Number(u.searchParams.get('w')) || 600, 100), 1600);
      if (DEMO || !/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(name)) return send(res, 404, { error: '사진 없음' });
      try {
        const uri = await cached(`photo:${name}:${w}`, 12 * 60 * 60e3, () => googlePhotoUri(name, w));
        res.writeHead(302, { Location: uri, 'Cache-Control': 'public, max-age=3600' }).end();
      } catch (e) {
        fail(e);
      }
      return;
    }
    send(res, 404, { error: 'Not found' });
  })
  .listen(PORT, () => {
    console.log(`동네맛집 레이더 API → http://localhost:${PORT}  (${DEMO ? '데모 모드: GOOGLE_PLACES_API_KEY 없음' : `Google Places, 검색당 ${CALLS_PER_SEARCH}회 호출, 캐시 ${CACHE_MINUTES}분`})`);
  });
