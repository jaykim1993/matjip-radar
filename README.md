# 동네맛집 레이더 (matjip-radar)

현재 위치 주변 음식점·카페를 **Google 평점(리뷰 수 보정) · 리뷰 수 · 거리**로 점수를 매겨 추천하는 웹·앱입니다.
**Expo(React Native) 한 코드**로 웹, iOS, Android를 모두 만듭니다.

> 마지막 정리: 2026-10-28

---

## 1. 현재 상황 요약

| 항목 | 상태 |
|---|---|
| 웹 (PC 브라우저) | ✅ 실제 Google 데이터로 동작 확인 |
| 휴대폰 (Expo Go) | ⚠️ 코드는 준비됨. 실제 기기 테스트는 아직 안 함 |
| 스토어 배포 (iOS·Android) | ❌ 아직 안 함 |
| 서버 배포 (인터넷 공개) | ❌ 아직 안 함. 지금은 내 PC에서만 실행 |
| git 저장소 | ❌ 아직 없음 (`git init` 필요) |

### 지금 되는 기능

- **내 위치 기반 주변 맛집**: GPS로 위치를 잡고, 반경(500m~3km) 안 음식점 또는 카페를 점수 순으로 보여줌
  - 위치 권한이 없으면 지도를 **클릭(웹) / 길게 눌러(앱)** 기준 위치 지정
- **필터·정렬**: 카테고리(한식·일식…), 가격대(1만원 미만 / 1만원대 / 2만원대 / 3만원 이상), 영업 중만 / 종합점수·가까운 순·평점 순·리뷰 많은 순
- **검색**: 메뉴(곱창, 횟집)나 가게 이름(신상92)으로 검색
- **더 불러오기**: 목록 맨 아래 버튼으로 20곳씩, 최대 60곳까지 추가
- **카드 펼치기**: 카드를 누르면 왼쪽에 정사각형 사진(누르면 다음 장), 오른쪽에 소개·오늘 영업시간·전화·Google 리뷰 2개
- **오늘 뭐 먹지?**: 점수가 높을수록 잘 뽑히는 랜덤 추천
- **지도**: 마커 크기·진하기 = 점수, 마커 누르면 해당 카드로 이동
- 다크 모드, 넓은 화면(지도|목록) / 좁은 화면(지도 위·목록 아래) 자동 전환

### 알려진 한계

- Google은 **한 번에 최대 20곳**만 줌 → 반경을 넓혀도 처음엔 20곳, 나머지는 "더 불러오기"로
- 한국은 Google 리뷰가 적어서 **동네 작은 가게는 빠지거나 리뷰가 적을 수 있음**
- 점수는 **그때 화면에 뜬 가게들끼리 비교한 상대 점수** → 같은 가게도 목록마다 점수가 다름
- Google 소개 문구는 국내 가게 대부분 비어 있음 (리뷰는 나옴)
- `app/src/components/PhotoPanel.tsx`는 **안 쓰는 파일** (예전 "지도 위 사진" 방식). 지워도 됨

---

## 2. 폴더 구조

```
matjip-radar/
├─ README.md            ← 이 문서
├─ server/              API 서버 (Node, 설치할 패키지 없음)
│  ├─ server.js         Google 호출, 캐시, 검색·상세·사진 API
│  ├─ lib/score.js      점수 계산, 가격대 처리
│  ├─ .env              ★ 실제 API 키 (깃에 올리면 안 됨)
│  └─ .env.example      설정 예시 (키 비워둔 버전)
└─ app/                 Expo 앱 (웹·iOS·Android)
   ├─ .env              서버 주소 (없으면 http://localhost:3000)
   ├─ .env.example
   ├─ app.json          앱 이름, 번들 ID, 위치 권한 문구
   └─ src/
      ├─ app/_layout.tsx        루트 레이아웃
      ├─ app/index.tsx          메인 화면
      ├─ components/
      │  ├─ SearchBar.tsx       검색창
      │  ├─ Filters.tsx         종류·반경·가격·정렬·카테고리·오늘 뭐 먹지
      │  ├─ PlaceCard.tsx       순위 카드, 점수 막대
      │  ├─ PlaceDetailView.tsx 카드 펼침 (사진·영업시간·리뷰)
      │  ├─ PickCard.tsx        랜덤 추천 카드
      │  ├─ PlaceMap.tsx        지도 (앱: react-native-maps)
      │  ├─ PlaceMap.web.tsx    지도 (웹: Leaflet + OpenStreetMap)
      │  └─ ui.tsx              버튼·칩 공통 컴포넌트
      ├─ hooks/
      │  ├─ useLocation.ts      위치 권한, 현재 위치, 수동 지정
      │  ├─ useNearby.ts        목록 불러오기, 더 불러오기
      │  └─ useDetail.ts        카드 상세 불러오기
      ├─ lib/
      │  ├─ api.ts              서버 호출
      │  ├─ places.ts           거리 계산, 필터·정렬, 랜덤 추천
      │  └─ types.ts            데이터 타입
      └─ theme.ts               색상 (라이트/다크)
```

**구조 원칙**: Google API 키는 **서버에만** 있습니다. 앱은 우리 서버만 부르고, 서버가 Google을 대신 부릅니다. 앱 안에 키를 넣으면 누구나 꺼내 쓸 수 있기 때문입니다. 사진도 서버를 거쳐 주소만 넘깁니다.

---

## 3. 켜고 끄기

### 처음 한 번만

```bash
# Node 18 이상 필요 (node -v 로 확인)
cd ~/Desktop/Repos/matjip-radar/app
npm install
```

`server/.env`가 없으면 `server/.env.example`을 복사해 `.env`로 만들고 키를 넣습니다 (4장 참고).

### 매번 켜기 — 터미널 2개

```bash
# 터미널 1: 서버 (켜 둔 채로 둠)
cd ~/Desktop/Repos/matjip-radar/server
node server.js
```

터미널에 아래처럼 나오면 정상입니다.

- `Google Places, 검색당 1회 호출 …` → 실제 데이터 모드
- `데모 모드: GOOGLE_PLACES_API_KEY 없음` → 키가 없어서 가짜 데이터 모드

```bash
# 터미널 2: 앱
cd ~/Desktop/Repos/matjip-radar/app
npx expo start
```

Expo 화면에서:

| 키 | 동작 |
|---|---|
| `w` | 웹 브라우저로 열기 |
| `r` | 새로고침 |
| QR 코드 | 휴대폰 Expo Go 앱으로 스캔 |

### 끄기

두 터미널에서 각각 **Ctrl+C**. 서버가 꺼져 있으면 Google 호출이 없으므로 **비용도 0원**입니다.

### 코드를 바꾼 뒤

- `server/` 파일을 바꿨으면 → 서버를 **Ctrl+C 후 다시 `node server.js`**
- `app/` 파일만 바꿨으면 → 브라우저 새로고침 (또는 Expo에서 `r`)

### 휴대폰으로 테스트할 때

휴대폰에서 `localhost`는 휴대폰 자신을 뜻하므로, PC 주소를 알려줘야 합니다.

1. PC에서 `ipconfig` 실행 → IPv4 주소 확인 (예: `192.168.0.12`)
2. `app/.env` 파일에 입력:
   ```
   EXPO_PUBLIC_API_URL=http://192.168.0.12:3000
   ```
3. PC와 휴대폰이 **같은 와이파이**인지 확인
4. `npx expo start`를 다시 켜고 QR 스캔

Android 에뮬레이터는 `http://10.0.2.2:3000`을 씁니다.

---

## 4. API 키 (Google Places)

지금 필요한 키는 **Google Places API 키 하나**입니다.
(카카오·네이버는 쓰지 않습니다. 네이버 검색 API는 신규 신청이 막혀 Google로 바꿨습니다.)

### 키 발급 방법

1. [Google Cloud 콘솔](https://console.cloud.google.com) 접속
   - 오른쪽 위 계정이 **본인 계정**인지 확인 (다른 계정이면 "추가 액세스 권한 필요" 화면이 뜸)
2. 상단 **프로젝트 선택 → 새 프로젝트** → 이름 `matjip-radar`로 생성
3. **결제 계정 연결** — $300 무료 체험으로 시작하면 직접 유료로 업그레이드하기 전에는 자동 청구 안 됨
4. **API 및 서비스 → 라이브러리** → `Places API (New)` 검색 → **사용**
5. **API 및 서비스 → 사용자 인증 정보 → + 사용자 인증 정보 만들기 → API 키**
   - ⚠️ "OAuth 클라이언트 ID"가 **아님**. API 키만 있으면 됨
6. 만들어진 키 클릭 → **API 제한사항 → 키 제한 → Places API (New)** 만 체크 → 저장
7. `server/.env`에 붙여넣기:
   ```
   GOOGLE_PLACES_API_KEY=AIza...
   ```
   - ⚠️ `.env.example`이 아니라 **`.env`** 에 넣을 것 (`.env.example`은 깃에 올라가는 파일)

### 과금 막기 (꼭 해두기)

Google은 기능별로 **월 무료 한도**가 있고, 넘으면 과금됩니다. 혼자 테스트하는 수준이면 넘을 일이 거의 없지만, 안전장치를 걸어 두세요.

1. **API 및 서비스 → Places API (New) → 할당량** 에서 아래 항목을 각각 **하루 30회** 정도로 제한
   - Nearby Search (주변 목록)
   - Text Search (검색, 더 불러오기)
   - Place Details (카드 펼치기)
   - Place Photos (사진)
2. **결제 → 예산 및 알림** 에서 예산 1,000원 알림 설정

| 기능 | 언제 호출되나 | Google 요금 등급 | 월 무료 |
|---|---|---|---|
| 주변 목록 | 앱을 열거나 반경·종류를 바꿀 때 | Nearby Search Enterprise | 1,000회 |
| 검색 / 더 불러오기 | 검색 1번(반경 안 결과가 5곳 미만이면 +1회), 더 불러오기 1번당 | Text Search Enterprise | 1,000회 |
| 카드 펼치기 | 카드를 처음 펼칠 때 | Place Details Enterprise + Atmosphere | 1,000회 |
| 사진 | 카드 사진 1장당 | Place Photos | 1,000회 |

- 같은 동네(약 100m 단위)·같은 조건 결과는 **6시간 동안 서버가 기억**해서 다시 부르지 않음
- 카드 상세는 **24시간**, 사진 주소는 **12시간** 기억
- 서버를 껐다 켜면 기억이 지워짐

### 개발을 멈출 때

서버를 끄면 호출이 없어서 과금될 일은 없습니다. 키가 유출되면 남이 쓸 수 있으니, 완전히 안심하려면 콘솔에서 아래 중 하나를 하세요.

- **키 삭제** (사용자 인증 정보 → 키 삭제) — 다시 할 때 새로 만들면 됨
- **Places API (New) 사용 중지**
- **프로젝트 종료** (30일 안에 복구 가능)

---

## 5. 설정값 (`server/.env`)

| 이름 | 기본값 | 설명 |
|---|---|---|
| `GOOGLE_PLACES_API_KEY` | (없음) | Google 키. 비우면 데모 모드 |
| `GOOGLE_CALLS_PER_SEARCH` | `1` | 주변 목록 1번에 Google 호출 수. `2`면 인기순+가까운순 합쳐 최대 40곳 (호출 2배) |
| `PHOTOS_PER_PLACE` | `4` | 카드 펼칠 때 불러올 사진 수 (사진 1장 = 1회 호출) |
| `CACHE_MINUTES` | `360` | 같은 동네 결과를 기억하는 시간(분) |
| `CORS_ORIGINS` | (비움=모두 허용) | 웹 앱 주소. 인터넷에 배포할 때 꼭 지정 |
| `PORT` | `3000` | 서버 포트 |
| `DEMO` | (없음) | `1`이면 키가 있어도 데모 데이터 |

앱 쪽 `app/.env`에는 `EXPO_PUBLIC_API_URL`(서버 주소) 하나만 있습니다.

---

## 6. 점수 계산 방식 (`server/lib/score.js`)

화면에 뜬 후보들끼리 비교한 **상대 점수(0~100)** 입니다.

| 지표 | 계산 | 비중 |
|---|---|---|
| 평점 | 베이지안 평균 → 후보 안에서 최저~최고를 0~1로 펼침 | 50% |
| 리뷰 수 | 로그 스케일 (리뷰가 많을수록 높지만 차이를 완만하게) | 30% |
| 거리 | 반경 대비 가까울수록 높음, 반경 밖은 0 | 20% |

- **베이지안 평균**: 리뷰가 적은 가게의 평점을 주변 평균 쪽으로 당김. 리뷰 3개짜리 5.0점이 리뷰 800개짜리 4.5점보다 위로 가지 않게 하는 장치 (기준: 리뷰 30개)
- 평점은 대부분 4.0~4.6에 몰려 있어서, 그대로 쓰면 차이가 안 나기 때문에 후보 안에서 펼침
- **리뷰 10개 미만** → "리뷰 적음" 표시 / 평점 없는 가게 → 평점 점수 0
- **가격대**: Google의 1인 가격 범위(예: 1~2만원)를 그대로 표시. 필터는 최저가 기준 4단계
- **영업 중**: Google 데이터 그대로. 점수에는 안 넣고 필터로만 사용
- 비중을 바꾸려면 `score.js`의 `WEIGHTS`를 수정

### 검색 규칙

- 먼저 **반경 안**에서 검색
- 반경 안 결과가 **5곳 미만**이면 가게 이름일 수 있으니 **반경 밖(20km 이내)** 까지 한 번 더 찾음
- 가게 이름이 검색어와 **같거나**, 검색어(3글자 이상)로 **시작**하면 → 맨 위에 고정 + 반경 밖이어도 표시("반경 밖" 표시)
- "횟집", "곱창" 같은 메뉴 검색은 → 반경 안에서 점수 순 그대로
- 지하철역처럼 음식점이 아닌 결과는 제외

---

## 7. 서버 API (참고)

| 주소 | 설명 |
|---|---|
| `GET /api/nearby?lat=&lng=&radius=&type=food\|cafe` | 주변 목록 (`&q=검색어` 붙이면 검색) |
| `GET /api/more?…(같은 조건)` | 20곳 더 불러오기 (최대 60곳) |
| `GET /api/place/{id}` | 카드 상세 (소개, 영업시간, 전화, 리뷰, 사진 목록) |
| `GET /api/photo?name=&w=` | 사진 (Google 사진 주소로 연결) |
| `GET /api/status` | 실데이터/데모 모드 확인 |

---

## 8. 문제 해결

| 증상 | 확인할 것 |
|---|---|
| 화면에 "데모 데이터" 안내가 뜸 | `server/.env`에 키가 있는지 (`.env.example` 아님), 서버 재시작 |
| "서버에 연결하지 못했어요" | 서버 터미널이 켜져 있는지 / 휴대폰이면 `EXPO_PUBLIC_API_URL`이 PC IP인지 |
| 코드를 바꿨는데 그대로임 | 서버 재시작 + 브라우저 새로고침 |
| 반경을 넓혀도 20곳 | 정상. 목록 맨 아래 "더 불러오기" |
| Google 지도에 있는 가게가 안 나옴 | 가게 이름으로 검색 (반경 밖도 찾음) |
| "할당량을 다 썼어요" | 콘솔에서 걸어둔 하루 한도 도달. 내일 다시 또는 한도 조정 |
| "권한이 없거나 결제 계정이 연결되지 않았어요" | Places API (New) 사용 설정, 결제 계정 연결, 키 제한 확인 |
| 위치가 서울시청으로 나옴 | 브라우저 위치 권한 허용 후 "내 위치" 버튼, 또는 지도 클릭으로 지정 |
| `bash: d: command not found` 등 | 명령어 오타 (`cd` 확인), 지금 폴더 위치 확인 |

---

## 9. 다음에 할 일 (후보)

- [ ] `git init` + 첫 커밋 (`.env`는 `.gitignore`에 이미 들어 있음)
- [ ] 휴대폰 Expo Go로 실제 테스트
- [ ] 안 쓰는 `PhotoPanel.tsx` 삭제
- [ ] 잘 아는 동네에서 상위 10곳이 실제 맛집과 맞는지 점검 → 필요하면 `WEIGHTS` 조정
- [ ] 동네 가게 누락이 많으면: 카카오 가게 목록 + Google 평점 합치기
- [ ] 리뷰 요약(LLM) — 호출마다 비용 발생하므로 사용자 생긴 뒤 검토
- [ ] 서버 배포 (Render, Railway, Fly.io, Cloud Run 등) + `CORS_ORIGINS` 지정
- [ ] 웹 배포: `cd app && npx expo export --platform web` → `dist/`를 Vercel·Netlify·Firebase Hosting 등에 업로드 (위치 기능은 HTTPS 필수)
- [ ] 앱 출시: `npx eas-cli@latest build --platform all` → `npx eas-cli@latest submit`
  - Android 스토어 빌드에는 Google Maps SDK for Android 키 필요 → `app.json` `plugins`에 추가:
    ```json
    ["react-native-maps", { "androidGoogleMapsApiKey": "process.env.GOOGLE_MAPS_ANDROID_KEY" }]
    ```
- [ ] 사용자가 늘면 OpenStreetMap 공용 지도 타일 대신 유료 타일 또는 카카오/네이버 지도 SDK로 교체

---

## 10. 기술 스택

| 영역 | 사용 |
|---|---|
| 앱 | Expo SDK 58, Expo Router, React 19, React Native 0.88, TypeScript |
| 지도 | 웹: Leaflet + OpenStreetMap / iOS: Apple 지도 / Android: Google 지도 (react-native-maps) |
| 위치 | expo-location |
| 서버 | Node 18+ 기본 모듈만 사용 (패키지 설치 없음) |
| 데이터 | Google Places API (New): Nearby Search, Text Search, Place Details, Place Photos |
