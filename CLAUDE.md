# CLAUDE.md — 동겜랭크 프로젝트 가이드

## Claude 행동 규칙

### 1. 반드시 한국어로 답변
모든 답변, 설명, 코드 주석 제안은 한국어로 작성한다.

### 2. 오류는 원인과 해결책을 세트로 제시
오류나 문제를 설명할 때 반드시 아래 형식을 따른다.

```
**원인**: (왜 이 오류가 발생하는지)
**해결책**: (어떻게 고치는지)
```

### 3. 파일 조작은 일괄 실행
여러 파일을 수정할 때 하나씩 묻지 않고 한 번에 모두 실행한다.

---

## 프로젝트 개요

**동겜랭크(DongGameRank)** — 동네 기반 미니게임 랭킹 플랫폼

WarioWare 스타일의 초단기 미니게임(3~5초)으로 동네·학교 단위 랭킹을 경쟁하는 커뮤니티 게임 서비스.

---

## 기술 스택

### 모노레포 구조 (Turborepo)

```
project-a/
├── apps/
│   ├── server/   # NestJS 백엔드
│   └── web/      # React 프론트엔드
├── packages/
│   └── shared/   # 공용 타입 & 유틸
└── docs/
    ├── PLANNING.md
    └── SETUP.md
```

| 영역 | 기술 |
|------|------|
| 백엔드 | NestJS 10, TypeORM, PostgreSQL 14, Redis, Socket.IO |
| 프론트엔드 | React 18, Vite 5, Tailwind CSS, Zustand, Socket.IO Client |
| 공용 | TypeScript 5.4, 공유 타입·유틸 패키지 |
| 인증 | JWT, Passport.js (Kakao / Google / Apple OAuth) |

---

## 핵심 기능

| 기능 | 설명 |
|------|------|
| 소셜 로그인 | Kakao / Google / Apple OAuth |
| 동네 인증 | GPS 기반 반경 확인 (7일 쿨다운) |
| 학교 인증 | 이메일 또는 학생증 인증 |
| 25개 미니게임 | 반응/퍼즐/액션/정밀/특수 5개 카테고리 |
| 실시간 매칭 | WebSocket PvP 매칭 (ELO 차이 300 이내) |
| ELO 레이팅 | 승패 결과에 따른 레이팅 산정 |
| 다중 랭킹 | 동네 / 학교 / 전국 랭킹 |
| 지도 탐색 | 근처 게이머 발견 |
| 외부 연동 | 리그 오브 레전드 / 발로란트 계정 연결 |

---

## 25개 미니게임

### ⚡ 반응/속도
1. **타이밍 히트** — 원이 줄어들 때 정확한 타이밍에 탭
2. **스피드 탭** — 5초 안에 최대한 빠르게 탭
3. **번개 반응** — 화면 번쩍임에 즉시 반응
4. **풍선 터트리기** — 떨어지는 풍선 터트리기 (폭탄 회피)
5. **두더지 잡기** — 랜덤 등장하는 두더지 탭

### 🧠 퍼즐/논리
6. **기억 플래시** — 패턴 암기 후 재현
7. **색깔 맞추기** — 텍스트 색상이 단어와 일치하는지 판단
8. **큰 숫자** — 두 숫자 중 더 큰 것 선택
9. **같은 그림** — 6개 아이콘 중 일치하는 쌍 찾기
10. **홀짝** — 숫자가 홀수인지 짝수인지 판단

### 🎮 액션/모션
11. **흔들기** — 최대 강도로 폰 흔들기
12. **방향 스와이프** — 화살표 방향으로 스와이프
13. **기울기 밸런스** — 폰 기울여 공을 목표 위치에 유지
14. **바 멈추기** — 이동하는 바를 정확한 위치에서 정지
15. **빠른 가위바위보** — AI를 이기는 패 선택

### 🎯 정밀/집중
16. **선 따라가기** — 곡선 경로를 손가락으로 추적
17. **타겟 저격** — 움직이는 타겟을 정확한 타이밍에 명중
18. **암실 탭** — 어둠 속에서 반짝이는 아이콘 탭
19. **나사 중심** — 회전하는 나사의 정중앙 탭
20. **선 늘리기** — 상대보다 긴 선 만들기

### 🌟 특수/파티
21. **수학 속산** — 덧셈 문제 빠르게 풀기
22. **마이크 외치기** — 마이크로 가장 큰 소리 내기
23. **컵 게임** — 공이 숨겨진 컵 추적
24. **이모지 분류** — 이모지를 행복/슬픔으로 분류
25. **더 많이 세기** — 아이콘이 더 많은 그룹 선택

---

## 데이터베이스 스키마 요약

| 테이블 | 주요 컬럼 |
|--------|-----------|
| `users` | id, nickname, email, authProvider, eloRating, primaryRegionId, schoolId |
| `regions` | id, name, district, city, latitude, longitude, radiusKm |
| `schools` | id, name, type(middle/high/university), regionId |
| `game_results` | id, userId, gameType, score, normalizedScore, mode, opponentId, regionId |
| `seasons` | id, name, startDate, endDate, isActive |
| `external_accounts` | id, userId, platform, game, tier, stats |

---

## API 엔드포인트 요약

### 인증
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/auth/login` | 소셜 로그인 |
| POST | `/api/auth/register` | 닉네임 등 등록 완료 |
| POST | `/api/auth/refresh` | JWT 토큰 갱신 |
| DELETE | `/api/auth/logout` | 로그아웃 |

### 유저
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/users/me` | 내 프로필 조회 |
| POST | `/api/users/region/verify` | GPS 동네 인증 |
| POST | `/api/users/school/verify` | 학교 인증 |

### 게임
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/games/result` | 게임 결과 제출 & ELO 갱신 |
| GET | `/api/games/history` | 게임 기록 (페이지네이션) |
| GET | `/api/games/types` | 전체 게임 타입 & 설정 |

### 랭킹
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/rankings/me` | 내 랭킹 위치 조회 |
| GET | `/api/rankings/national` | 전국 랭킹 |
| GET | `/api/rankings/:regionId/:gameType` | 동네 랭킹 |
| GET | `/api/rankings/school/:schoolId/:gameType` | 학교 랭킹 |

### 기타
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/map/users` | 주변 유저 탐색 |
| POST | `/api/external/connect/:platform` | 외부 게임 계정 연결 |
| GET | `/api/external/accounts` | 연결된 외부 계정 목록 |

---

## WebSocket 이벤트

| 이벤트 | 방향 | 설명 |
|--------|------|------|
| `match:request` | → 서버 | 매칭 요청 |
| `match:found` | ← 서버 | 상대 발견 |
| `match:cancel` | → 서버 | 매칭 취소 |
| `game:ready` | → 서버 | 게임 준비 완료 |
| `game:start` | ← 서버 | 게임 시작 (3초 카운트다운) |
| `game:action` | ↔ 양방향 | 실시간 게임 액션 |
| `game:opponent_action` | ← 서버 | 상대방 액션 수신 |

---

## 개발 명령어

```bash
# 전체 앱 실행 (프론트 + 백엔드)
npm run dev

# 개별 실행
npm run dev:web      # http://localhost:5173
npm run dev:server   # http://localhost:3000

# 빌드 & 린트
npm run build
npm run lint
```

### 환경 변수 (apps/server/.env)

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=donggamerank
JWT_SECRET=your-jwt-secret
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
GOOGLE_MAPS_API_KEY=your-key
RIOT_API_KEY=your-key
NEXON_API_KEY=your-key
```

---

## 주요 디렉토리 & 파일

```
apps/server/src/
├── auth/         # JWT 인증 & OAuth
├── users/        # 유저 CRUD, 동네·학교 인증
├── games/        # 게임 결과 처리 & ELO 계산
├── rankings/     # Redis 기반 랭킹 시스템
├── regions/      # GPS 동네 인증
├── schools/      # 학교 인증
├── external/     # Riot(LoL/발로란트), Nexon API 연동
├── map/          # 지리 기반 유저 탐색
├── match/        # WebSocket 실시간 매칭 게이트웨이
└── common/       # 공용 DTO, 응답 포맷, 데코레이터

apps/web/src/
├── games/        # 25개 미니게임 컴포넌트
├── pages/        # 라우트 페이지
├── components/   # 공용 UI 컴포넌트
├── stores/       # Zustand 상태 관리
└── lib/          # API 클라이언트, Socket.IO 설정

packages/shared/src/
├── types/        # 공용 TypeScript 타입 (game, user, ranking, api)
└── utils/        # ELO 계산, 점수 정규화
```
