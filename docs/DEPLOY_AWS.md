# ☁️ AWS EC2 배포 가이드 (Docker Compose)

EC2 인스턴스 하나에 **PostgreSQL + Redis + NestJS + React(Nginx)** 를 Docker Compose로 실행하는 가이드입니다.

---

## 📋 목차

1. [전체 구조](#1-전체-구조)
2. [EC2 인스턴스 생성](#2-ec2-인스턴스-생성)
3. [보안 그룹 설정](#3-보안-그룹-설정)
4. [서버 초기 설정](#4-서버-초기-설정-ssh-접속-후)
5. [Docker 설치](#5-docker-설치)
6. [코드 배포](#6-코드-배포)
7. [환경변수 설정](#7-환경변수-설정)
8. [실행](#8-실행)
9. [배포 후 확인](#9-배포-후-확인)
10. [코드 업데이트 방법](#10-코드-업데이트-방법)
11. [HTTPS 설정 (도메인 있는 경우)](#11-https-설정-도메인-있는-경우)
12. [자주 발생하는 문제](#12-자주-발생하는-문제)

---

## 1. 전체 구조

```
EC2 Ubuntu (80번 포트 외부 오픈)
│
└─ Docker Compose
   ├─ web (Nginx:80)   ← 브라우저 접속 진입점
   │   ├─ /           → React 정적 파일 서빙
   │   ├─ /api/*      → server:3000 으로 프록시
   │   └─ /socket.io  → server:3000 으로 프록시
   │
   ├─ server (NestJS:3000)
   ├─ db    (PostgreSQL:5432)
   └─ redis (Redis:6379)
```

---

## 2. EC2 인스턴스 생성

1. AWS 콘솔 → **EC2** → **인스턴스 시작**
2. 설정값:

| 항목 | 권장값 |
|:----:|:------:|
| AMI | **Ubuntu Server 22.04 LTS** |
| 인스턴스 유형 | **t3.small** (메모리 2GB, 월 ~$15) 또는 t3.micro (프리티어) |
| 스토리지 | **20GB** 이상 (기본 8GB는 부족할 수 있음) |
| 키 페어 | 새로 생성 → `.pem` 파일 안전하게 보관 |

3. **인스턴스 시작** 클릭 → 생성 완료 후 **퍼블릭 IPv4 주소** 복사

---

## 3. 보안 그룹 설정

EC2 → 인스턴스 선택 → **보안 탭** → **보안 그룹 클릭** → **인바운드 규칙 편집**

아래 규칙 추가:

| 유형 | 포트 | 소스 | 설명 |
|:----:|:----:|:----:|:----:|
| SSH | 22 | 내 IP | SSH 접속 |
| HTTP | 80 | 0.0.0.0/0 | 웹 서비스 |
| HTTPS | 443 | 0.0.0.0/0 | HTTPS (도메인 연결 시) |

> ⚠️ 3000, 5432, 6379 포트는 **외부에서 접근 불가**하게 닫아둡니다 (Docker 내부 통신만 사용).

---

## 4. 서버 초기 설정 (SSH 접속 후)

```bash
# 로컬에서 EC2 접속 (pem 파일 경로 및 EC2 IP 교체)
ssh -i ~/Downloads/your-key.pem ubuntu@퍼블릭IP
```

접속 후:

```bash
# 패키지 업데이트
sudo apt update && sudo apt upgrade -y

# Git 설치
sudo apt install -y git
```

---

## 5. Docker 설치

```bash
# Docker 공식 설치 스크립트
curl -fsSL https://get.docker.com | sudo sh

# 현재 유저를 docker 그룹에 추가 (재접속 후 적용)
sudo usermod -aG docker ubuntu

# Docker Compose v2 설치
sudo apt install -y docker-compose-plugin

# 재접속 (그룹 적용)
exit
```

다시 SSH 접속 후 확인:

```bash
docker --version          # Docker version 24.x.x
docker compose version    # Docker Compose version v2.x.x
```

---

## 6. 코드 배포

```bash
# 레포지토리 클론
git clone https://github.com/pkyeesl08/project-a.git
cd project-a
```

---

## 7. 환경변수 설정

```bash
# 템플릿 복사
cp .env.prod.example .env.prod

# 편집기로 열기
nano .env.prod
```

아래 값을 실제로 채워 넣습니다:

```env
# EC2 퍼블릭 IP (예: 43.201.12.34)
SERVER_IP=43.201.12.34

# DB 비밀번호 (원하는 값으로 설정)
DB_PASSWORD=MyStr0ngDBpass!

# JWT 시크릿 (아래 명령으로 생성)
JWT_SECRET=<openssl rand -hex 32 결과 붙여넣기>

# Redis 비밀번호 (원하는 값으로 설정)
REDIS_PASSWORD=MyStr0ngRedispass!
```

> 💡 JWT_SECRET 생성:
> ```bash
> openssl rand -hex 32
> ```

`Ctrl+O` → 저장, `Ctrl+X` → 나가기

---

## 8. 실행

```bash
# 이미지 빌드 및 백그라운드 실행 (첫 실행은 5~10분 소요)
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

실행 상태 확인:

```bash
docker compose -f docker-compose.prod.yml ps
```

정상 시 아래처럼 표시됩니다:

```
NAME                STATUS
project-a-web-1     Up (healthy)
project-a-server-1  Up (healthy)
project-a-db-1      Up (healthy)
project-a-redis-1   Up (healthy)
```

브라우저에서 `http://퍼블릭IP` 접속하면 앱이 열립니다.

---

## 9. 배포 후 확인

```bash
# 서버 로그 확인
docker compose -f docker-compose.prod.yml logs server --tail=50

# DB 로그 확인
docker compose -f docker-compose.prod.yml logs db --tail=20

# API 헬스체크
curl http://localhost/api
```

---

## 10. 코드 업데이트 방법

코드를 수정하고 GitHub에 push한 뒤, EC2에서:

```bash
cd ~/project-a

# 최신 코드 pull
git pull origin main

# 이미지 재빌드 & 재시작
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

> ⏱️ 이미지 재빌드는 레이어 캐시 덕분에 처음보다 빠릅니다 (보통 1~3분).

---

## 11. HTTPS 설정 (도메인 있는 경우)

도메인이 있으면 무료 SSL 인증서를 발급받을 수 있습니다.

### 11.1 도메인 DNS 설정

도메인 구매처(가비아, 카페24 등)에서:
```
A 레코드:  @  →  EC2 퍼블릭IP
A 레코드:  www →  EC2 퍼블릭IP
```

### 11.2 Certbot 설치 및 인증서 발급

```bash
# Certbot 설치
sudo snap install --classic certbot

# 일시적으로 80포트 직접 사용 (컨테이너 종료 필요)
docker compose -f docker-compose.prod.yml stop web

# 인증서 발급
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# 인증서 위치 확인
sudo ls /etc/letsencrypt/live/yourdomain.com/
```

### 11.3 nginx.conf 수정

`nginx.conf` 파일을 아래로 교체:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    location /api {
        proxy_pass         http://server:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-Proto https;
    }

    location /socket.io {
        proxy_pass         http://server:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "Upgrade";
        proxy_set_header   Host       $host;
        proxy_read_timeout 3600s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

`docker-compose.prod.yml`의 web 서비스에 SSL 볼륨 추가:

```yaml
  web:
    ...
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
```

그 다음 `.env.prod`의 `CORS_ORIGIN`을 `https://yourdomain.com`으로 변경 후 재빌드:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

---

## 12. 자주 발생하는 문제

### ❌ 브라우저에서 접속이 안 됨

**원인**: 보안 그룹 80포트가 닫혀 있습니다.

**해결책**: AWS 콘솔 → EC2 → 보안 그룹 → 인바운드 규칙에서 HTTP(80) 허용 확인

---

### ❌ `server` 컨테이너가 계속 재시작됨

**원인**: `.env.prod` 환경변수 오류이거나 DB 연결 실패입니다.

**해결책**:
```bash
docker compose -f docker-compose.prod.yml logs server --tail=30
```
로그에서 오류 메시지 확인 → `.env.prod` 값 재확인

---

### ❌ `Cannot find module` 빌드 에러

**원인**: shared 패키지 빌드 실패입니다.

**해결책**:
```bash
# 이미지와 빌드 캐시 완전 삭제 후 재빌드
docker compose -f docker-compose.prod.yml down
docker system prune -f
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

---

### ❌ 디스크 공간 부족

**원인**: 오래된 Docker 이미지가 쌓였습니다.

**해결책**:
```bash
# 사용하지 않는 이미지/컨테이너 정리
docker system prune -af
```

---

### ❌ DB 데이터가 사라짐

**원인**: `docker compose down -v` 명령이 볼륨까지 삭제합니다.

**해결책**: 컨테이너 재시작 시 `-v` 옵션 없이 사용:
```bash
docker compose -f docker-compose.prod.yml down   # ✅ 볼륨 유지
docker compose -f docker-compose.prod.yml down -v  # ❌ 볼륨 삭제됨 (DB 초기화!)
```

---

## 📞 참고 문서

| 문서 | 링크 |
|:----:|:----:|
| 로컬 실행 | [SETUP.md](./SETUP.md) |
| Vercel/Railway 배포 | [DEPLOY.md](./DEPLOY.md) |
| 서비스 기획 | [PLANNING.md](./PLANNING.md) |
