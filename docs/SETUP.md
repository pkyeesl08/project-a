# 🚀 동겜랭크 설치 및 실행 가이드

이 문서는 **동겜랭크(DongGameRank)** 프로젝트를 로컬 환경에서 실행하기 위한 전체 과정을 안내합니다.

---

## 📋 목차

1. [사전 준비](#1-사전-준비)
2. [프로젝트 클론](#2-프로젝트-클론)
3. [의존성 설치](#3-의존성-설치)
4. [PostgreSQL 설정](#4-postgresql-설정)
5. [환경변수 설정](#5-환경변수-설정)
6. [프론트엔드 실행](#6-프론트엔드-실행-웹)
7. [백엔드 실행](#7-백엔드-실행-서버)
8. [전체 동시 실행](#8-전체-동시-실행)
9. [자주 발생하는 문제](#9-자주-발생하는-문제-해결)
10. [프로젝트 구조 참고](#10-프로젝트-구조-참고)

---

## 1. 사전 준비

아래 소프트웨어가 설치되어 있어야 합니다.

| 소프트웨어 | 최소 버전 | 확인 명령어 | 필수 여부 |
|:----------:|:---------:|:-----------:|:---------:|
| **Node.js** | 18.0+ | `node -v` | ✅ 필수 |
| **npm** | 9.0+ | `npm -v` | ✅ 필수 (Node.js 함께 설치됨) |
| **Git** | 2.0+ | `git --version` | ✅ 필수 |
| **PostgreSQL** | 14+ | `psql --version` | ⚠️ 백엔드 실행 시 필수 |
| **Redis** | 6.0+ | `redis-cli --version` | 🔧 선택 (랭킹 기능) |

### Node.js 설치

**Mac (Homebrew)**
```bash
brew install node@20
```

**Windows**
- https://nodejs.org 에서 LTS 버전 다운로드 후 설치
- 또는 [nvm-windows](https://github.com/coreybutler/nvm-windows) 사용:
```powershell
nvm install 20
nvm use 20
```

**Ubuntu/Debian**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### PostgreSQL 설치

**Mac (Homebrew)**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Windows**
- https://www.postgresql.org/download/windows/ 에서 설치
- 설치 시 비밀번호를 `postgres`로 설정하면 편합니다
- pgAdmin도 함께 설치됩니다

**Ubuntu/Debian**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Redis 설치 (선택)

> Redis가 없어도 기본 동작은 가능합니다 (in-memory mock 사용).

**Mac**
```bash
brew install redis
brew services start redis
```

**Windows**
- WSL2에서 Linux 방식으로 설치하거나
- https://github.com/microsoftarchive/redis/releases 에서 설치

**Ubuntu/Debian**
```bash
sudo apt install redis-server
sudo systemctl start redis
```

---

## 2. 프로젝트 클론

```bash
git clone https://github.com/pkyeesl08/project-a.git
cd project-a
```

---

## 3. 의존성 설치

프로젝트 루트에서 한 번만 실행하면 모든 워크스페이스(web, server, shared)의 패키지가 설치됩니다.

```bash
npm install
```

> ⏱️ 첫 설치 시 2~3분 소요될 수 있습니다.

설치 후 아래 명령어로 정상 설치 확인:
```bash
# 공유 패키지 빌드 확인
npx turbo run build --filter=@donggamerank/shared
```

---

## 4. PostgreSQL 설정

### 4.1 데이터베이스 생성

**Mac/Linux**
```bash
# postgres 유저로 접속 (Mac은 보통 본인 계정으로 바로 접속 가능)
psql -U postgres

# DB 생성
CREATE DATABASE donggamerank;

# 확인
\l

# 나가기
\q
```

**Windows (pgAdmin 사용)**
1. pgAdmin 실행
2. 좌측 Servers → PostgreSQL 우클릭 → Connect
3. Databases 우클릭 → Create → Database
4. Database name: `donggamerank` 입력 후 Save

**Windows (커맨드라인)**
```powershell
# PostgreSQL bin 폴더가 PATH에 있어야 합니다
psql -U postgres
CREATE DATABASE donggamerank;
\q
```

### 4.2 접속 확인

```bash
psql -U postgres -d donggamerank -c "SELECT 1;"
```

`?column? | 1` 이 나오면 성공입니다.

---

## 5. 환경변수 설정

```bash
# 서버 환경변수 파일 생성
cp apps/server/.env.example apps/server/.env
```

`apps/server/.env` 파일을 열어서 본인 환경에 맞게 수정합니다:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres        # ← 본인 DB 유저명
DB_PASSWORD=postgres        # ← 본인 DB 비밀번호
DB_NAME=donggamerank

# Auth
JWT_SECRET=my-super-secret-key-change-this

# Redis (없으면 그대로 두세요)
REDIS_HOST=localhost
REDIS_PORT=6379

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

> 💡 **Mac Homebrew 유저**: DB_PASSWORD가 필요 없을 수 있습니다. 빈 문자열(`DB_PASSWORD=`)로 두세요.

---

## 6. 프론트엔드 실행 (웹)

```bash
npm run dev:web
```

브라우저에서 **http://localhost:5173** 접속하면 앱이 나타납니다.

> 📱 **프론트만 먼저 확인 가능합니다!**
> 백엔드 없이도 게임 플레이 UI는 전부 동작합니다.
> 게임 목록 → 아무 게임 선택 → 시작하기 → 플레이 해보세요!

---

## 7. 백엔드 실행 (서버)

> ⚠️ PostgreSQL이 실행 중이어야 합니다.

```bash
npm run dev:server
```

정상 실행 시 콘솔에 아래와 같이 표시됩니다:
```
[Nest] LOG [NestApplication] Nest application successfully started
🚀 Server running on http://localhost:3000
```

### API 테스트

```bash
# 게임 타입 목록 조회 (인증 불필요)
curl http://localhost:3000/api/games/types | json_pp

# 헬스체크
curl http://localhost:3000/api
```

---

## 8. 전체 동시 실행

Turborepo를 통해 프론트엔드 + 백엔드를 동시에 실행할 수 있습니다:

```bash
npm run dev
```

| 서비스 | URL | 설명 |
|:------:|:---:|:----:|
| **웹 (프론트)** | http://localhost:5173 | React 앱 |
| **서버 (백엔드)** | http://localhost:3000 | NestJS API |

---

## 9. 자주 발생하는 문제 해결

### ❌ `npm install` 실패

```bash
# node_modules 및 lock 파일 삭제 후 재시도
rm -rf node_modules apps/*/node_modules packages/*/node_modules package-lock.json
npm install
```

### ❌ `Cannot find module '@donggamerank/shared'`

공유 패키지가 빌드되지 않은 경우입니다:
```bash
cd packages/shared
npx tsc
cd ../..
```

### ❌ `connect ECONNREFUSED 127.0.0.1:5432`

PostgreSQL이 실행되고 있지 않습니다:
```bash
# Mac
brew services start postgresql@16

# Ubuntu
sudo systemctl start postgresql

# Windows
# 서비스 관리자에서 PostgreSQL 서비스 시작
net start postgresql-x64-16
```

### ❌ `password authentication failed for user "postgres"`

`.env` 파일의 `DB_PASSWORD`가 실제 설정과 다릅니다.

PostgreSQL 비밀번호 재설정:
```bash
sudo -u postgres psql
ALTER USER postgres WITH PASSWORD 'your-new-password';
\q
```

그 다음 `.env`의 `DB_PASSWORD`를 동일하게 변경하세요.

### ❌ `relation "users" does not exist`

DB 테이블이 아직 생성되지 않았습니다. 서버는 TypeORM의 `synchronize: true` 설정으로 첫 실행 시 자동 생성합니다. 서버를 한 번 실행해주세요:
```bash
npm run dev:server
```

### ❌ 포트 충돌 (이미 사용 중인 포트)

```bash
# 어떤 프로세스가 포트를 사용 중인지 확인
lsof -i :5173    # 프론트 포트
lsof -i :3000    # 백엔드 포트

# 해당 프로세스 종료
kill -9 <PID>
```

### ❌ Windows에서 `turbo` 명령어 에러

```powershell
# npx로 실행
npx turbo run dev

# 또는 전역 설치
npm install -g turbo
```

---

## 10. 프로젝트 구조 참고

```
project-a/
├── apps/
│   ├── server/                 # NestJS 백엔드
│   │   ├── src/
│   │   │   ├── auth/           # 소셜 로그인 (카카오/구글/애플)
│   │   │   ├── users/          # 유저 CRUD
│   │   │   ├── games/          # 게임 결과 처리, ELO 계산
│   │   │   ├── rankings/       # 랭킹 조회 (Redis Sorted Set)
│   │   │   ├── regions/        # 동네 인증 (GPS)
│   │   │   ├── schools/        # 학교 인증
│   │   │   ├── external/       # 외부 게임 연동 (LoL, 발로란트)
│   │   │   ├── map/            # 지도 탐색
│   │   │   ├── match/          # 실시간 매칭 (Socket.IO)
│   │   │   └── common/         # 공통 (DTO, 응답 헬퍼, 데코레이터)
│   │   ├── .env.example
│   │   └── package.json
│   │
│   └── web/                    # React 프론트엔드
│       ├── src/
│       │   ├── games/          # 25종 미니게임 컴포넌트
│       │   ├── pages/          # 라우트 페이지 (7개)
│       │   ├── components/     # 공통 UI
│       │   ├── stores/         # Zustand 상태관리
│       │   └── lib/            # API 클라이언트, 소켓
│       └── package.json
│
├── packages/
│   └── shared/                 # 공유 패키지
│       ├── types/              # TypeScript 타입 정의
│       └── utils/              # ELO 계산, 점수 정규화
│
├── turbo.json                  # Turborepo 설정
├── package.json                # 루트 (워크스페이스 정의)
└── docs/
    ├── SETUP.md                # ← 이 문서
    └── PLANNING.md             # 서비스 기획서
```

---

## 🎮 바로 플레이해보기

설치가 완료되면:

1. `npm run dev:web` 실행
2. http://localhost:5173 접속
3. **게임** 탭 → 아무 게임 선택
4. **시작하기** 버튼 클릭!

25종의 미니게임을 바로 체험할 수 있습니다.

---

## 📞 문의

프로젝트 관련 문의사항은 [Issues](https://github.com/pkyeesl08/project-a/issues)에 남겨주세요.
