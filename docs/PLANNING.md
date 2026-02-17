# 🎮 동겜랭크 — 서비스 기획서 & 시스템 설계서

**동네 게임 랭킹 플랫폼**
Version 1.0 | 2026.02.17

---

## 1. 프로젝트 개요

### 1.1 핵심 가치

| 키워드 | 설명 |
|:------:|------|
| **동네 자부심** | "우리 동네/학교가 최고!" — 로컬 커뮤니티 경쟁심 |
| **초단타 재미** | 와리오웨어처럼 3~5초면 끝나는 중독성 게임 |
| **통합 랭킹** | 동네 게임 + LoL/발로란트 등 외부 게임 랭킹까지 한곳에서 |
| **지도 탐색** | 지도에서 주변 게이머를 발견하고 도전하는 재미 |
| **지속성** | 시즌/대회 시스템으로 반복 방문 유도 |

---

## 2. 핵심 기능 정의

### 2.1 동네 인증 시스템

당근마켓과 유사한 GPS 기반 동네 인증을 통해 유저의 활동 지역을 설정합니다.

- GPS 기반 현재 위치 확인 및 동네 자동 설정
- 동네 변경 시 **7일 쿨다운** 적용
- 최대 **2개 동네**까지 등록 가능
- 동네 인증 완료 시 해당 동네 랭킹에 참여 가능

### 2.2 학교 인증 시스템

동네 외에 학교 기반 랭킹을 제공하여 학생 유저의 참여를 높입니다.

- 학교 이메일 인증 (`@school.ac.kr`) 또는 학생증 인증
- 중학교 / 고등학교 / 대학교 구분
- 학교 내 랭킹, 학교 vs 학교 대항전
- 졸업생도 동문 랭킹 참여 가능 (졸업생 태그)

### 2.3 미니게임 (와리오웨어 스타일)

와리오웨어처럼 3~5초 안에 승부가 나는 초단타 미니게임. **출시 시 25종**, 이후 지속 추가합니다.

#### ⚡ 반응/스피드 계열 (5종)

| # | 게임 | 설명 | 시간 |
|:-:|------|------|:----:|
| 1 | 타이밍 히트 | 원이 수축하는 타이밍에 정확히 탭 | 3초 |
| 2 | 스피드 탭 | 제한 시간 내 최대한 빠르게 탭 | 5초 |
| 3 | 번개 반응 | 화면 색 변경 시 즉시 탭 (반응속도 측정) | 3초 |
| 4 | 풍선 터뜨리기 | 떠오르는 풍선을 터뜨려라 (폭탄 주의!) | 5초 |
| 5 | 두더지 잡기 | 랜덤으로 나타나는 두더지를 탭 | 5초 |

#### 🧠 판단/퍼즐 계열 (5종)

| # | 게임 | 설명 | 시간 |
|:-:|------|------|:----:|
| 6 | 기억력 플래시 | 잠깐 보여준 패턴을 맞추기 | 5초 |
| 7 | 컬러 매치 | 글자 색과 단어가 일치하는지 판단 | 5초 |
| 8 | 큰 수 찾기 | 두 숫자 중 큰 쪽을 빠르게 선택 | 5초 |
| 9 | 같은 그림 찾기 | 6개 중 같은 그림 2개를 찾기 | 5초 |
| 10 | 홀짝 판별 | 숫자가 홀수/짝수인지 빠르게 판단 | 5초 |

#### 🎮 액션/모션 계열 (5종)

| # | 게임 | 설명 | 시간 |
|:-:|------|------|:----:|
| 11 | 흔들어 승부 | 폰을 흔들어 진동수 대결 | 5초 |
| 12 | 방향 스와이프 | 화살표 방향으로 빠르게 스와이프 | 5초 |
| 13 | 기울기 균형 | 폰을 기울여 공을 중심에 유지 | 5초 |
| 14 | 정확히 멈춰! | 좌우로 움직이는 바를 정확한 위치에 멈추기 | 3초 |
| 15 | 가위바위보 스피드 | AI가 낸 걸 보고 이기는 패를 내기 | 5초 |

#### 🎯 정밀/집중 계열 (5종)

| # | 게임 | 설명 | 시간 |
|:-:|------|------|:----:|
| 16 | 선 따라그리기 | 곡선 경로를 따라 손가락 이동 | 5초 |
| 17 | 과녁 저격수 | 움직이는 과녁의 중심을 정확히 탭 | 5초 |
| 18 | 어두운 방 터치 | 잠깐 번쩍이는 빛을 정확히 탭 | 5초 |
| 19 | 나사 정중앙 | 드래그로 나사를 정중앙에 맞추기 | 3초 |
| 20 | 줄 늘리기 대결 | 탭해서 줄을 AI보다 더 길게 | 5초 |

#### 🌟 특수/파티 계열 (5종)

| # | 게임 | 설명 | 시간 |
|:-:|------|------|:----:|
| 21 | 연산 스피드 | 간단한 덧셈 문제를 빠르게 풀기 | 5초 |
| 22 | 마이크 소리치기 | 마이크로 가장 큰 소리를 내기 | 5초 |
| 23 | 어디에 숨었게? | 셸 게임 — 공이 든 컵을 추적 | 5초 |
| 24 | 이모지 분류기 | 이모지가 기쁨인지 슬픔인지 분류 | 5초 |
| 25 | 누가 더 많지? | 두 그룹 중 아이콘이 더 많은 쪽 선택 | 5초 |

#### 게임 플로우

```
랜덤 게임 출제 → 3초 카운트다운 → 게임 플레이 (3~5초) → 결과 → 다음 게임
```

- **연속 모드**: 5판 랜덤 → 종합 점수로 랭킹 반영
- **대전 모드**: 같은 게임을 동시에 플레이, 실시간 점수 비교

### 2.4 랭킹 시스템

다양한 범위의 랭킹을 제공하여 경쟁심을 자극합니다.

| 범위 | 설명 | 예시 |
|:----:|------|------|
| 동네 | 동네(읍/면/동) 단위 | 역삼동 1위 |
| 학교 | 학교 내 랭킹 | OO고등학교 1위 |
| 구/군 | 구/군 단위 통합 | 강남구 1위 |
| 시/도 | 시/도 단위 통합 | 서울시 1위 |
| 전국 | 전국 랭킹 | 전국 1위 |
| 게임별 | 각 미니게임별 세부 랭킹 | 스피드 탭 전국 1위 |

- **ELO 레이팅 시스템** 기반 점수 산정
- 시즌 종료 시 랭킹 초기화 및 보상 지급
- 동네/학교 대표 선수 (Top 3) 별도 표시 및 프로필 뱃지

### 2.5 지도 탐색 (Game Map)

지도에서 주변 게이머를 발견하고 도전할 수 있는 기능입니다.

- 퍼블릭 프로필 설정 시 지도에 본인 위치 표시
- 지도에서 주변 유저 탭 → 프로필 카드 (닉네임, 랭킹, 대표 게임)
- **바로 대전 신청** 버튼으로 즉석 대전 가능
- **동네 히트맵**: 활성 유저가 많은 지역은 더 밝게 표시
- 프라이버시: 기본 비공개, 유저가 직접 퍼블릭 ON 시만 노출

### 2.6 실시간 대전

같은 동네 또는 다른 동네 유저와 1:1 실시간 대전을 제공합니다.

| 모드 | 설명 |
|:----:|------|
| 동네 내 매칭 | 같은 동네 유저 우선 매칭 |
| 동네 대항전 | 우리 동네 vs 옆 동네 단체전 (5vs5) |
| 학교 대항전 | 우리 학교 vs 다른 학교 단체전 |
| 지도 대전 | 지도에서 퍼블릭 유저를 찾아 도전 |
| 빠른 매칭 | 전국 랜덤 매칭 |
| 친선전 | 친구 초대를 통한 프라이빗 대전 |

### 2.7 시즌/대회 시스템

- **정규 시즌**: 3개월 단위 (봄/여름/가을/겨울)
- **주간 챌린지**: 매주 특정 게임 랭킹전
- **동네 대항 토너먼트**: 월 1회, 동네 대표 5인이 참가
- **시즌 보상**: 프로필 뱃지, 칭호, 이모티콘

### 2.8 외부 게임 랭킹 연동

LoL, 발로란트 등 외부 게임 계정을 연동하면 해당 게임 랭킹도 동네/학교 기준으로 조회할 수 있습니다.

| 플랫폼 | 연동 게임 | 데이터 |
|:------:|----------|--------|
| Riot Games | LoL, 발로란트 | 티어, 랭크, 승률 |
| Battle.net | 오버워치 2 | 랭크, 플레이 시간 |
| Nexon | 피파 온라인 | 등급, 전적 |

- 유저 프로필에서 연동된 게임별 티어/랭크 통합 표시
- 동네에서 "LoL 다이아 이상" 유저 몇 명인지 통계 제공
- 외부 랭킹도 동네/학교 기준 필터 적용 가능

### 2.9 소셜 기능

- **친구 추가**: 닉네임 검색 / QR코드 / 카카오톡 초대
- **동네 채팅방**: 동네별 오픈 채팅 (게임 모집, 잡담)
- **프로필**: 전적, 랭킹, 뱃지, 대표 게임, 연동 게임 티어 표시
- **알림**: 대전 요청, 시즌 시작/종료, 랭킹 변동 푸시 알림

---

## 3. 시스템 아키텍처

### 3.1 기술 스택

| 레이어 | 기술 |
|:------:|------|
| **프론트엔드 (웹)** | React 18, Vite, Tailwind CSS, Zustand |
| **프론트엔드 (모바일)** | React Native (Expo) — 예정 |
| **백엔드** | NestJS, TypeORM, Passport (JWT) |
| **실시간** | Socket.IO (매칭, 대전, 채팅) |
| **데이터베이스** | PostgreSQL |
| **캐시/랭킹** | Redis (Sorted Set) |
| **인프라** | 모노레포 (Turborepo + npm workspaces) |

### 3.2 아키텍처 구성

```
[Client Layer]
  React Web App (PWA 지원)
  React Native Mobile App (iOS / Android)

[API Layer]
  NestJS REST API Server (인증, 유저, 게임, 랭킹)
  Socket.IO Server (실시간 대전, 매칭, 채팅)
  API Gateway (로드밸런싱, Rate Limiting)
  External Game API Adapter (Riot, Battle.net, Nexon)

[Data Layer]
  PostgreSQL: 유저, 게임 기록, 시즌, 학교 데이터
  Redis: 실시간 랭킹 (Sorted Set), 매칭 큐, 세션 캐시
  S3: 프로필 이미지, 게임 리소스
```

---

## 4. 데이터베이스 설계

### users (유저)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | 유저 ID |
| nickname | VARCHAR(20) | 닉네임 (유니크) |
| email | VARCHAR(255) | 이메일 (유니크) |
| auth_provider | ENUM | kakao / google / apple |
| profile_image | TEXT | 프로필 이미지 URL |
| primary_region_id | UUID (FK) | 주 동네 |
| secondary_region_id | UUID (FK) | 부 동네 |
| school_id | UUID (FK) | 학교 |
| is_public | BOOLEAN | 지도 노출 여부 |
| elo_rating | INTEGER | ELO 레이팅 (기본 1000) |
| created_at | TIMESTAMP | 가입일 |
| last_active_at | TIMESTAMP | 최근 활동일 |

### regions (지역)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | 지역 ID |
| name | VARCHAR(50) | 동네 이름 |
| district | VARCHAR(50) | 구/군 |
| city | VARCHAR(50) | 시/도 |
| latitude | DECIMAL | 위도 |
| longitude | DECIMAL | 경도 |
| radius_km | DECIMAL | 인증 반경 (km) |

### schools (학교)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | 학교 ID |
| name | VARCHAR(100) | 학교명 |
| type | ENUM | middle / high / university |
| region_id | UUID (FK) | 소속 지역 |
| email_domain | VARCHAR | 인증용 이메일 도메인 |

### game_results (게임 기록)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | 기록 ID |
| user_id | UUID (FK) | 유저 |
| game_type | VARCHAR(50) | 게임 종류 |
| score | INTEGER | 원점수 |
| normalized_score | INTEGER | 정규화 점수 (0~100) |
| mode | ENUM | solo / pvp / team |
| opponent_id | UUID (FK) | 상대 (PvP) |
| match_id | UUID | 매치 ID |
| region_id | UUID (FK) | 당시 동네 |
| season_id | UUID (FK) | 시즌 |
| metadata | JSONB | 추가 데이터 |
| played_at | TIMESTAMP | 플레이 시각 |

### external_accounts (외부 게임 연동)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | ID |
| user_id | UUID (FK) | 유저 |
| platform | VARCHAR | riot / battlenet / nexon |
| game | VARCHAR | lol / valorant / ow2 / fifaonline |
| external_id | VARCHAR | 외부 게임 ID |
| tier | VARCHAR | 티어 정보 |
| last_synced_at | TIMESTAMP | 마지막 동기화 |

### rankings (Redis Sorted Set)

```
Key: ranking:{scope}:{scope_id}:{game_type}:{season_id}
Scope: region / school / district / city / national / external

ZREVRANGE → Top N 조회
ZRANK → 개인 순위 조회
```

---

## 5. API 설계

### 5.1 REST API

#### 인증

| Method | Path | 설명 |
|:------:|------|------|
| POST | `/api/auth/login` | 소셜 로그인 (카카오/구글/애플) |
| POST | `/api/auth/refresh` | 토큰 갱신 |
| DELETE | `/api/auth/logout` | 로그아웃 |

#### 유저

| Method | Path | 설명 |
|:------:|------|------|
| GET | `/api/users/me` | 내 정보 조회 |
| PATCH | `/api/users/me` | 프로필 수정 |
| GET | `/api/users/:id/stats` | 유저 통계 |
| POST | `/api/users/region/verify` | 동네 인증 (GPS) |
| POST | `/api/users/school/verify` | 학교 인증 |

#### 게임

| Method | Path | 설명 |
|:------:|------|------|
| POST | `/api/games/result` | 게임 결과 저장 |
| GET | `/api/games/history` | 플레이 기록 |
| GET | `/api/games/types` | 게임 타입 목록 |

#### 랭킹

| Method | Path | 설명 |
|:------:|------|------|
| GET | `/api/rankings/me` | 내 랭킹 |
| GET | `/api/rankings/:regionId/:gameType` | 동네 랭킹 |
| GET | `/api/rankings/school/:schoolId/:gameType` | 학교 랭킹 |
| GET | `/api/rankings/national` | 전국 랭킹 |

#### 지도

| Method | Path | 설명 |
|:------:|------|------|
| GET | `/api/map/users` | 주변 유저 (위도/경도/반경) |
| GET | `/api/map/heatmap` | 활성 유저 히트맵 |

#### 외부 게임 연동

| Method | Path | 설명 |
|:------:|------|------|
| POST | `/api/external/connect/:platform` | 외부 게임 연동 |
| DELETE | `/api/external/disconnect/:platform` | 연동 해제 |
| POST | `/api/external/sync/:platform` | 데이터 동기화 |
| GET | `/api/external/accounts` | 연동 계정 목록 |

### 5.2 WebSocket (Socket.IO)

| 이벤트 | 방향 | 설명 |
|--------|:----:|------|
| `match:request` | Client → Server | 매칭 요청 |
| `match:cancel` | Client → Server | 매칭 취소 |
| `match:found` | Server → Client | 매칭 성사 알림 |
| `game:ready` | Client → Server | 게임 준비 완료 |
| `game:start` | Server → Client | 게임 시작 (카운트다운) |
| `game:action` | Client ↔ Server | 실시간 게임 액션 |
| `game:opponent_action` | Server → Client | 상대 액션 전달 |
| `map:challenge` | Client → Server | 지도 대전 신청 |
| `map:challenge_response` | Client → Server | 도전 수락/거절 |

---

## 6. 화면 구성

| 화면 | 경로 | 주요 기능 |
|:----:|:----:|----------|
| 홈 | `/` | 동네 랭킹 요약, 빠른 게임, 진행 중 대회 |
| 게임 목록 | `/games` | 카테고리별 25종 게임 목록 |
| 게임 플레이 | `/play/:gameType` | 풀스크린 게임 플레이 |
| 랭킹 | `/rankings` | 동네/학교/구/시/전국 랭킹 탭 |
| 지도 | `/map` | 주변 유저 탐색, 도전 |
| 대전 | `/battle` | 매칭 대기, 실시간 대전 |
| 프로필 | `/profile` | 내 정보, 전적, 연동 게임 |

---

## 7. 프로젝트 디렉토리 구조

```
project-a/
├── apps/
│   ├── web/                    # React 웹 (Vite)
│   ├── mobile/                 # React Native (Expo) — 예정
│   └── server/                 # NestJS 백엔드
│       └── src/
│           ├── auth/           # 인증
│           ├── users/          # 유저
│           ├── games/          # 게임 로직
│           ├── rankings/       # 랭킹
│           ├── regions/        # 지역
│           ├── schools/        # 학교
│           ├── external/       # 외부 게임 연동
│           ├── map/            # 지도 탐색
│           ├── match/          # 매칭/대전
│           └── common/         # 공통 인프라
├── packages/
│   └── shared/                 # 공유 코드
│       ├── types/              # TypeScript 타입
│       └── utils/              # ELO, 점수 정규화
├── docs/                       # 문서
├── turbo.json
└── package.json
```

---

## 8. 개발 로드맵

### Phase 1 — 기반 구축 (2주)

- [x] 모노레포 셋업 (Turborepo)
- [x] NestJS 서버 기본 구조
- [x] PostgreSQL + TypeORM 엔터티
- [x] JWT 인증 모듈
- [x] React + Vite 프론트 기본 구조

### Phase 2 — 핵심 기능 (3주)

- [x] 미니게임 25종 구현
- [x] 게임 결과 저장 + ELO 계산
- [x] 동네 인증 (GPS)
- [x] 랭킹 조회 (동네/학교/전국)
- [x] 게임 플레이 페이지 + 결과 화면

### Phase 3 — 실시간/소셜 (3주)

- [x] Socket.IO 매칭 시스템
- [ ] 실시간 PvP 대전 완성
- [ ] 지도 탐색 + 유저 도전
- [ ] 동네 대항 토너먼트

### Phase 4 — 외부 연동/확장 (2주)

- [x] 외부 게임 연동 API 구조
- [ ] Riot Games API 실제 연동
- [ ] Battle.net / Nexon API 연동
- [ ] 외부 랭킹 동네/학교 필터

### Phase 5 — 런칭 준비 (2주)

- [ ] 소셜 로그인 실제 구현 (카카오/구글/애플)
- [ ] 푸시 알림
- [ ] 시즌/대회 시스템
- [ ] 성능 최적화 + 배포

### MVP 범위 (Phase 1~2 완료 시)

- ✅ 카카오 로그인 + 동네 인증
- ✅ 와리오 스타일 미니게임 25종 (솔로 모드)
- ✅ 동네 랭킹 조회
- ✅ 기본 프로필 및 전적 표시
