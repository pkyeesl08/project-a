# 🎮 동겜랭크 (DongGameRank)

> 동네 기반 초단타 미니게임 랭킹 플랫폼

## 구조

```
├── apps/
│   ├── server/          NestJS (Auth, Games, Rankings, Map, Match)
│   └── web/             React + Vite + Tailwind
└── packages/
    └── shared/          타입, ELO, 점수 정규화
```

## 실행

```bash
npm install
npm run dev           # 전체
npm run dev:web       # localhost:5173
npm run dev:server    # localhost:3000
```

## 미니게임 25종

| 카테고리 | 게임 |
|:------:|------|
| ⚡ 반응 | 타이밍 히트 · 스피드 탭 · 번개 반응 · 풍선 터뜨리기 · 두더지 잡기 |
| 🧠 퍼즐 | 기억력 플래시 · 컬러 매치 · 큰 수 찾기 · 같은 그림 찾기 · 홀짝 판별 |
| 🎮 액션 | 흔들어 승부 · 방향 스와이프 · 기울기 균형 · 정확히 멈춰! · 가위바위보 |
| 🎯 정밀 | 선 따라그리기 · 과녁 저격수 · 어두운 방 터치 · 나사 심배 · 줄세우기 |
| 🌟 파티 | 연산 스피드 · 마이크 소리치기 · 어디에 숨었게? · 이모지 분류기 · 누가 더 많지? |

## API

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/auth/login` | 소셜 로그인 |
| GET  | `/api/users/me` | 내 정보 |
| POST | `/api/users/region/verify` | 동네 인증 |
| POST | `/api/users/school/verify` | 학교 인증 |
| POST | `/api/games/result` | 게임 결과 |
| GET  | `/api/rankings/:regionId/:gameType` | 동네 랭킹 |
| GET  | `/api/map/users` | 주변 유저 |
| POST | `/api/external/connect/:platform` | 외부 게임 연동 |

## WebSocket

| 이벤트 | 방향 | 설명 |
|--------|:---:|------|
| `match:request` | → | 매칭 요청 |
| `match:found` | ← | 매칭 성사 |
| `game:start` | ← | 게임 시작 |
| `game:action` | ↔ | 실시간 액션 |

## 문서

- 📘 [설치 및 실행 가이드](docs/SETUP.md) — 환경 설정부터 실행까지 상세 안내
- 📋 [서비스 기획서](docs/PLANNING.md) — 기능 정의, DB 설계, API, 로드맵

## 기술 스택

React 18 · NestJS · TypeORM · PostgreSQL · Redis · Socket.IO · Turborepo · Tailwind CSS
