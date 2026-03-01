# 🚀 동겜랭크 배포 가이드

이 문서는 **동겜랭크(DongGameRank)** 를 실제 웹에서 접근 가능하도록 배포하는 전체 과정을 안내합니다.

> **권장 배포 조합 (무료/저비용)**
> | 서비스 | 플랫폼 | 요금 |
> |:------:|:------:|:----:|
> | 프론트엔드 (React) | **Vercel** | 무료 |
> | 백엔드 (NestJS) | **Railway** | 월 $5 크레딧 무료 제공 |
> | 데이터베이스 (PostgreSQL) | **Railway** 또는 **Supabase** | 무료 |
> | 캐시 (Redis) | **Upstash** | 무료 |

---

## 📋 목차

1. [배포 구조 개요](#1-배포-구조-개요)
2. [사전 준비](#2-사전-준비)
3. [데이터베이스 설정 (Railway PostgreSQL)](#3-데이터베이스-설정-railway-postgresql)
4. [Redis 설정 (Upstash)](#4-redis-설정-upstash)
5. [백엔드 배포 (Railway)](#5-백엔드-배포-railway)
6. [프론트엔드 배포 (Vercel)](#6-프론트엔드-배포-vercel)
7. [환경변수 전체 정리](#7-환경변수-전체-정리)
8. [도메인 연결](#8-도메인-연결-선택)
9. [GitHub Actions CI/CD 설정](#9-github-actions-cicd-설정-선택)
10. [배포 후 확인 체크리스트](#10-배포-후-확인-체크리스트)
11. [자주 발생하는 문제](#11-자주-발생하는-문제)

---

## 1. 배포 구조 개요

```
사용자 브라우저
      │
      ▼
┌─────────────┐        ┌──────────────────┐
│   Vercel    │──API──▶│    Railway       │
│  (React 앱) │        │  (NestJS 서버)   │
│             │◀──WS───│                  │
└─────────────┘        └──────┬─────┬─────┘
                              │     │
                    ┌─────────┘     └─────────┐
                    ▼                         ▼
            ┌──────────────┐         ┌──────────────┐
            │   Railway    │         │   Upstash    │
            │ (PostgreSQL) │         │   (Redis)    │
            └──────────────┘         └──────────────┘
```

---

## 2. 사전 준비

### 2.1 필요한 계정 생성

아래 서비스에 GitHub 계정으로 가입합니다.

| 서비스 | 주소 | 용도 |
|:------:|:----:|:----:|
| Vercel | https://vercel.com | 프론트엔드 호스팅 |
| Railway | https://railway.app | 백엔드 + DB 호스팅 |
| Upstash | https://upstash.com | Redis 호스팅 |

### 2.2 코드 GitHub에 올리기

배포 전 최신 코드가 GitHub에 push되어 있어야 합니다.

```bash
git add .
git commit -m "배포 준비"
git push origin main
```

---

## 3. 데이터베이스 설정 (Railway PostgreSQL)

### 3.1 Railway 프로젝트 생성

1. [railway.app](https://railway.app) 로그인
2. **New Project** 클릭
3. **Provision PostgreSQL** 선택

### 3.2 연결 정보 확인

생성된 PostgreSQL 서비스 클릭 → **Variables** 탭에서 아래 값 복사:

```
DATABASE_URL=postgresql://postgres:비밀번호@호스트:포트/railway
```

> 또는 개별 값으로:
> - `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

### 3.3 대안: Supabase 사용

Supabase가 더 편하다면:

1. [supabase.com](https://supabase.com) → **New Project** 생성
2. **Settings → Database** 에서 Connection string (URI) 복사
3. 해당 URI를 백엔드 환경변수 `DATABASE_URL`로 사용

---

## 4. Redis 설정 (Upstash)

### 4.1 Upstash Redis 생성

1. [console.upstash.com](https://console.upstash.com) 로그인
2. **Create Database** 클릭
3. 이름 입력, 지역 선택 (Asia Pacific - Seoul 권장)
4. **Create** 클릭

### 4.2 연결 정보 확인

생성된 DB 클릭 → **Details** 탭에서:

```
Endpoint: 호스트명
Port: 6379
Password: 비밀번호
```

또는 `REDIS_URL` (전체 URL) 복사.

---

## 5. 백엔드 배포 (Railway)

### 5.1 Railway에서 백엔드 서비스 추가

1. 기존 Railway 프로젝트로 이동
2. **+ New Service** → **GitHub Repo** 선택
3. `project-a` 레포지토리 선택
4. **Root Directory** 를 `apps/server`로 설정

### 5.2 빌드 & 시작 명령어 설정

**Settings → Deploy** 탭에서:

```
Build Command:   cd ../.. && npm install && npm run build --filter=server
Start Command:   node apps/server/dist/main.js
```

> ⚠️ **Turborepo 모노레포** 이므로 루트에서 빌드해야 shared 패키지가 함께 빌드됩니다.

대안으로 Railway의 `railway.toml` 파일을 루트에 추가하는 방법도 있습니다 ([9절 참고](#railway-설정-파일-옵션)).

### 5.3 환경변수 설정

**Variables** 탭에서 아래 환경변수를 추가합니다.

```env
# 데이터베이스 (Railway PostgreSQL에서 복사)
DB_HOST=호스트
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=비밀번호
DB_NAME=railway

# 또는 단일 URL (TypeORM이 지원하는 경우)
DATABASE_URL=postgresql://postgres:비밀번호@호스트:포트/railway

# JWT
JWT_SECRET=매우-복잡한-랜덤-문자열-32자-이상  # openssl rand -hex 32

# Redis (Upstash에서 복사)
REDIS_HOST=호스트명
REDIS_PORT=6379
REDIS_PASSWORD=비밀번호

# 서버 설정
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://your-app.vercel.app   # 프론트엔드 배포 후 실제 URL로 교체

# 외부 API (선택)
GOOGLE_MAPS_API_KEY=your-key
RIOT_API_KEY=your-key
NEXON_API_KEY=your-key
```

> 💡 `JWT_SECRET`은 터미널에서 `openssl rand -hex 32` 명령으로 안전한 값을 생성하세요.

### 5.4 배포 확인

Railway 배포 완료 후 제공되는 URL (예: `https://server-xxx.railway.app`)로 접속:

```bash
# 헬스체크
curl https://server-xxx.railway.app/api

# 게임 타입 목록
curl https://server-xxx.railway.app/api/games/types
```

---

## 6. 프론트엔드 배포 (Vercel)

### 6.1 Vercel에 프로젝트 연결

1. [vercel.com](https://vercel.com) → **Add New Project**
2. GitHub 레포지토리 `project-a` 선택
3. **Framework Preset**: `Vite` 선택
4. **Root Directory**: `apps/web` 설정

### 6.2 빌드 설정

Vercel 설정에서:

| 항목 | 값 |
|:----:|:--:|
| Framework Preset | Vite |
| Root Directory | `apps/web` |
| Build Command | `cd ../.. && npm install && npm run build --filter=web` |
| Output Directory | `dist` |
| Install Command | (비워두거나 `npm install`) |

### 6.3 환경변수 설정

**Settings → Environment Variables**에서:

```env
VITE_API_URL=https://server-xxx.railway.app
VITE_SOCKET_URL=https://server-xxx.railway.app
```

### 6.4 Vercel 설정 파일 추가 (권장)

`apps/web/vercel.json` 파일을 생성합니다:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

> React Router 사용 시 페이지 새로고침 404 방지를 위해 필요합니다.

### 6.5 배포 완료

Vercel이 배포를 완료하면 `https://your-app.vercel.app` 형태의 URL이 제공됩니다.

이 URL을 Railway 백엔드의 `CORS_ORIGIN` 환경변수에 업데이트하세요.

---

## 7. 환경변수 전체 정리

### 백엔드 (Railway)

| 변수명 | 설명 | 예시 |
|:------:|:----:|:----:|
| `DB_HOST` | PostgreSQL 호스트 | `containers-us-west-xxx.railway.app` |
| `DB_PORT` | PostgreSQL 포트 | `5432` |
| `DB_USERNAME` | DB 유저명 | `postgres` |
| `DB_PASSWORD` | DB 비밀번호 | `랜덤값` |
| `DB_NAME` | DB 이름 | `railway` |
| `JWT_SECRET` | JWT 서명 키 | `openssl rand -hex 32` 결과 |
| `REDIS_HOST` | Upstash 호스트 | `us1-xxx.upstash.io` |
| `REDIS_PORT` | Redis 포트 | `6379` |
| `REDIS_PASSWORD` | Redis 비밀번호 | `Upstash 제공` |
| `PORT` | 서버 포트 | `3000` |
| `NODE_ENV` | 실행 환경 | `production` |
| `CORS_ORIGIN` | 허용 프론트엔드 URL | `https://your-app.vercel.app` |

### 프론트엔드 (Vercel)

| 변수명 | 설명 | 예시 |
|:------:|:----:|:----:|
| `VITE_API_URL` | 백엔드 API 주소 | `https://server-xxx.railway.app` |
| `VITE_SOCKET_URL` | WebSocket 서버 주소 | `https://server-xxx.railway.app` |

---

## 8. 도메인 연결 (선택)

커스텀 도메인 (예: `donggamerank.com`)을 연결하려면:

### Vercel (프론트엔드)

1. **Settings → Domains** → 도메인 추가
2. 도메인 구매처(가비아, 카페24 등)에서 CNAME 설정:
   ```
   CNAME  www  cname.vercel-dns.com
   ```

### Railway (백엔드)

1. **Settings → Networking** → **Custom Domain** 추가
2. 도메인 구매처에서 CNAME 설정:
   ```
   CNAME  api  your-service.railway.app
   ```

---

## 9. GitHub Actions CI/CD 설정 (선택)

자동 배포가 이미 Vercel/Railway에서 지원되지만, 테스트 자동화가 필요하면 추가합니다.

`.github/workflows/deploy.yml` 파일 생성:

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Node.js 설정
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: 의존성 설치
        run: npm install

      - name: 빌드
        run: npm run build

      - name: 린트
        run: npm run lint
```

### Railway 설정 파일 옵션

프로젝트 루트에 `railway.toml` 추가:

```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "node apps/server/dist/main.js"
restartPolicyType = "on-failure"
restartPolicyMaxRetries = 3
```

---

## 10. 배포 후 확인 체크리스트

배포 완료 후 아래 항목을 순서대로 확인하세요.

### 백엔드 확인

- [ ] `https://server-xxx.railway.app/api` → `{"message":"Hello World"}` 응답
- [ ] `https://server-xxx.railway.app/api/games/types` → 게임 목록 JSON 반환
- [ ] Railway 로그에 DB 연결 오류 없음
- [ ] Railway 로그에 Redis 연결 오류 없음

### 프론트엔드 확인

- [ ] `https://your-app.vercel.app` 접속 → 메인 화면 표시
- [ ] 게임 탭 → 게임 목록 표시
- [ ] 아무 게임 선택 → 플레이 화면 진입
- [ ] 페이지 새로고침 → 404 없음 (vercel.json 설정 확인)

### 연동 확인

- [ ] 회원가입/로그인 동작
- [ ] 게임 결과 제출 → DB 저장 확인
- [ ] WebSocket 매칭 요청 → 연결 성공

---

## 11. 자주 발생하는 문제

### ❌ CORS 오류 (`Access-Control-Allow-Origin` 에러)

**원인**: 백엔드 `CORS_ORIGIN`이 실제 Vercel URL과 다릅니다.

**해결책**: Railway 환경변수에서 `CORS_ORIGIN`을 정확한 Vercel URL로 수정:
```
CORS_ORIGIN=https://your-app.vercel.app
```
변경 후 Railway 서비스를 재배포합니다.

---

### ❌ 빌드 실패 (`Cannot find module '@donggamerank/shared'`)

**원인**: 모노레포에서 shared 패키지가 먼저 빌드되지 않았습니다.

**해결책**: 빌드 명령어를 루트 기준으로 수정:
```bash
# Vercel Build Command
cd ../.. && npm install && npm run build --filter=web

# Railway Build Command
cd /app && npm install && npm run build --filter=server
```

---

### ❌ WebSocket 연결 실패

**원인**: Railway의 기본 설정이 WebSocket을 차단하거나, 프론트에서 잘못된 URL을 사용 중입니다.

**해결책**:
1. Vercel 환경변수 `VITE_SOCKET_URL`이 올바른 Railway URL인지 확인
2. Socket.IO 클라이언트 설정에서 `transports: ['websocket', 'polling']` 순서 확인
3. Railway는 기본적으로 WebSocket을 지원하므로 별도 설정 불필요

---

### ❌ DB 연결 실패 (`ECONNREFUSED` 또는 `SSL required`)

**원인**: Railway PostgreSQL은 SSL 연결을 요구할 수 있습니다.

**해결책**: `apps/server/src/app.module.ts`의 TypeORM 설정에 SSL 옵션 추가:
```typescript
ssl: process.env.NODE_ENV === 'production'
  ? { rejectUnauthorized: false }
  : false,
```

---

### ❌ Railway 배포 후 서버 계속 재시작

**원인**: 메모리 초과 또는 시작 명령어 오류입니다.

**해결책**:
1. Railway 로그 확인 → 에러 메시지 파악
2. 빌드 후 `dist/main.js` 파일이 존재하는지 확인
3. 시작 명령어: `node apps/server/dist/main.js` 정확히 입력

---

### ❌ Vercel 페이지 새로고침 시 404

**원인**: SPA(싱글 페이지 앱)에서 React Router 경로를 Vercel이 인식하지 못합니다.

**해결책**: `apps/web/vercel.json` 파일 생성:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 📞 추가 참고

| 문서 | 링크 |
|:----:|:----:|
| 로컬 실행 | [SETUP.md](./SETUP.md) |
| 서비스 기획 | [PLANNING.md](./PLANNING.md) |
| Vercel 공식 문서 | https://vercel.com/docs |
| Railway 공식 문서 | https://docs.railway.app |
| Upstash Redis 문서 | https://docs.upstash.com |
