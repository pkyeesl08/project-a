# AWS Free Tier 서버 셋업 가이드 (초보자용)

> DongGameRank 프로젝트를 AWS에 배포하는 전체 과정을 설명합니다.
> AWS를 처음 다루는 분도 따라할 수 있도록 모든 단계를 상세히 기술합니다.

---

## 목차

1. [전체 아키텍처 개요](#1-전체-아키텍처-개요)
2. [AWS 계정 생성](#2-aws-계정-생성)
3. [보안 설정 (IAM)](#3-보안-설정-iam)
4. [예산 알림 설정 (필수!)](#4-예산-알림-설정-필수)
5. [EC2 인스턴스 생성 (서버)](#5-ec2-인스턴스-생성-서버)
6. [RDS 생성 (PostgreSQL)](#6-rds-생성-postgresql)
7. [ElastiCache 생성 (Valkey)](#7-elasticache-생성-valkey)
8. [S3 + CloudFront (프론트엔드)](#8-s3--cloudfront-프론트엔드)
9. [EC2 서버 환경 설정](#9-ec2-서버-환경-설정)
10. [배포하기](#10-배포하기)
11. [도메인 연결 (선택)](#11-도메인-연결-선택)
12. [모니터링 및 유지보수](#12-모니터링-및-유지보수)
13. [비용 절약 팁](#13-비용-절약-팁)
14. [트러블슈팅](#14-트러블슈팅)

---

## 1. 전체 아키텍처 개요

```
[사용자 브라우저]
       │
       ▼
[CloudFront (CDN)] ─── [S3 버킷 (React 빌드 파일)]
       │
       │ /api, /socket.io 요청
       ▼
[EC2 (NestJS 서버)] ─── [ElastiCache (Redis)]
       │
       ▼
[RDS (PostgreSQL)]
```

### 사용할 AWS 서비스 정리

| 서비스 | 역할 | Free Tier |
|--------|------|-----------|
| EC2 (t2.micro) | NestJS 백엔드 서버 | 월 750시간 무료 |
| RDS (db.t3.micro) | PostgreSQL 데이터베이스 | 월 750시간, 20GB 무료 |
| ElastiCache (cache.t3.micro) | Valkey 캐시/소켓 | 월 750시간 무료 |
| S3 | React 빌드 파일 저장 | 5GB 무료 |
| CloudFront | CDN (빠른 콘텐츠 전달) | 월 1TB 전송 무료 |

---

## 2. AWS 계정 생성

### 2-1. 회원가입

1. https://aws.amazon.com/ko/ 접속
2. 우측 상단 **"AWS 계정 생성"** 클릭
3. 이메일 주소 입력 → 인증 코드 확인
4. 루트 사용자 비밀번호 설정 (강력한 비밀번호 사용!)

### 2-2. 연락처 정보

1. 계정 유형: **개인** 선택
2. 이름, 주소, 전화번호 입력 (영문으로 입력)

### 2-3. 결제 정보

1. **신용카드/체크카드 등록** (필수)
   - Free Tier를 쓰더라도 카드 등록은 필수입니다
   - 1달러(약 1,300원) 인증 결제 후 자동 환불됩니다
   - Free Tier 범위 내에서는 과금되지 않습니다

### 2-4. 본인 확인

1. SMS 또는 음성 통화로 인증

### 2-5. 지원 플랜

1. **기본 지원 - 무료** 선택 (Basic Support)
2. 유료 플랜은 선택하지 마세요!

### 2-6. 가입 완료

- 계정 활성화까지 최대 24시간 소요 (보통 몇 분 이내)
- 활성화 이메일을 받으면 다음 단계로 진행

---

## 3. 보안 설정 (IAM)

> 루트 계정을 직접 사용하는 것은 매우 위험합니다. 별도의 관리자 계정을 만들어 사용하세요.

### 3-1. MFA (2단계 인증) 활성화

1. AWS 콘솔 로그인 → 우측 상단 계정 이름 클릭 → **"보안 자격 증명"**
2. **"MFA 할당"** 클릭
3. **"인증 앱"** 선택 (Google Authenticator 또는 Authy 앱 사용)
4. 앱으로 QR 코드 스캔
5. 인증 코드 2개 연속 입력 → **"MFA 추가"**

### 3-2. IAM 사용자 생성

1. AWS 콘솔 → 검색창에 **"IAM"** 검색 → IAM 서비스 클릭
2. 좌측 메뉴 **"사용자"** → **"사용자 생성"**
3. 사용자 이름: `admin` (원하는 이름)
4. **"AWS Management Console에 대한 사용자 액세스 권한 제공"** 체크
5. **"IAM 사용자를 생성하고 싶음"** 선택
6. 비밀번호 설정

### 3-3. 권한 부여

1. **"직접 정책 연결"** 선택
2. 검색창에 `AdministratorAccess` 검색
3. **"AdministratorAccess"** 체크 → **"다음"** → **"사용자 생성"**

### 3-4. 로그인 확인

1. IAM 대시보드에 표시된 **"로그인 URL"** 복사 (북마크 해두세요)
2. 루트 계정 로그아웃
3. 복사한 URL로 접속 → IAM 사용자 이름/비밀번호로 로그인
4. **앞으로는 항상 이 IAM 계정으로 로그인하세요**

---

## 4. 예산 알림 설정 (필수!)

> 과금 폭탄을 방지하기 위해 반드시 설정하세요.

### 4-1. 예산 생성

1. AWS 콘솔 → 검색창에 **"Billing"** 검색 → **"Billing and Cost Management"** 클릭
2. 좌측 메뉴 **"예산(Budgets)"** 클릭
3. **"예산 생성"** 클릭
4. 설정:
   - 예산 유형: **비용 예산**
   - 예산 이름: `monthly-budget`
   - 기간: **월별**
   - 예산 금액: `5` (USD) → 한화 약 6,500원
5. **"다음"**

### 4-2. 알림 설정

1. **알림 추가:**
   - 임계값: `80` % (예산의 80% = $4 도달 시)
   - 이메일: 본인 이메일 입력
2. **알림 하나 더 추가:**
   - 임계값: `100` % (예산 초과 시)
   - 이메일: 본인 이메일 입력
3. **"예산 생성"** 클릭

### 4-3. Free Tier 사용량 알림

1. Billing → **"Billing preferences"** (결제 기본 설정)
2. **"Free Tier 사용량 알림 받기"** 활성화
3. 이메일 주소 입력 → 저장

---

## 5. EC2 인스턴스 생성 (서버)

> NestJS 백엔드 서버를 실행할 가상 서버를 만듭니다.

### 5-1. 리전 선택

1. AWS 콘솔 우측 상단에서 리전을 **"아시아 태평양 (서울) ap-northeast-2"** 로 변경
   - 한국 사용자를 대상으로 하므로 서울 리전이 가장 빠릅니다

### 5-2. 키 페어 생성

> 서버에 SSH로 접속하기 위한 비밀 키입니다. 잃어버리면 다시 만들어야 합니다!

1. AWS 콘솔 → 검색창에 **"EC2"** 검색 → EC2 대시보드
2. 좌측 메뉴 **"네트워크 및 보안"** → **"키 페어"**
3. **"키 페어 생성"** 클릭
4. 설정:
   - 이름: `donggamerank-key`
   - 키 페어 유형: **RSA**
   - 프라이빗 키 파일 형식: **.pem** (Mac/Linux) 또는 **.ppk** (Windows PuTTY)
5. **"키 페어 생성"** → .pem 파일이 자동 다운로드됨
6. **이 파일을 안전한 곳에 보관하세요!** (절대 공유하지 마세요)

```bash
# Mac/Linux: 키 파일 권한 설정 (필수)
chmod 400 ~/Downloads/donggamerank-key.pem
```

### 5-3. 보안 그룹 생성

> 서버의 방화벽 규칙을 설정합니다.

1. EC2 대시보드 → 좌측 **"네트워크 및 보안"** → **"보안 그룹"**
2. **"보안 그룹 생성"** 클릭
3. 기본 정보:
   - 보안 그룹 이름: `donggamerank-ec2-sg`
   - 설명: `Security group for DongGameRank EC2`
   - VPC: 기본 VPC (default) 선택
4. **인바운드 규칙 추가:**

| 유형 | 포트 범위 | 소스 | 설명 |
|------|----------|------|------|
| SSH | 22 | 내 IP | SSH 접속 (내 컴퓨터만) |
| HTTP | 80 | 0.0.0.0/0 | 웹 트래픽 |
| HTTPS | 443 | 0.0.0.0/0 | 보안 웹 트래픽 |
| 사용자 지정 TCP | 3000 | 0.0.0.0/0 | NestJS API 서버 |

5. **"보안 그룹 생성"** 클릭

### 5-4. EC2 인스턴스 생성

1. EC2 대시보드 → **"인스턴스 시작"** 클릭
2. **이름**: `donggamerank-server`
3. **OS 이미지 (AMI)**:
   - **Amazon Linux 2023** 선택 (프리 티어 사용 가능 표시 확인)
   - 아키텍처: **64비트 (x86)**
4. **인스턴스 유형**:
   - **t2.micro** 선택 (프리 티어 사용 가능)
   - 1 vCPU, 1GB RAM
5. **키 페어**:
   - 위에서 만든 `donggamerank-key` 선택
6. **네트워크 설정**:
   - **"편집"** 클릭
   - 퍼블릭 IP 자동 할당: **활성화**
   - 기존 보안 그룹 선택: `donggamerank-ec2-sg`
7. **스토리지**:
   - **20 GiB** gp3 (프리 티어에서 30GB까지 무료)
8. **"인스턴스 시작"** 클릭

### 5-5. 탄력적 IP (Elastic IP) 할당

> 인스턴스를 재시작해도 IP가 변하지 않도록 고정 IP를 할당합니다.

1. EC2 대시보드 → 좌측 **"네트워크 및 보안"** → **"탄력적 IP"**
2. **"탄력적 IP 주소 할당"** 클릭 → **"할당"**
3. 할당된 IP 선택 → **"작업"** → **"탄력적 IP 주소 연결"**
4. 인스턴스: `donggamerank-server` 선택 → **"연결"**

> **주의**: Elastic IP는 EC2에 연결되어 있으면 무료, 연결 안 하면 과금됩니다!

### 5-6. SSH 접속 확인

```bash
# Mac/Linux 터미널에서:
ssh -i ~/Downloads/donggamerank-key.pem ec2-user@[탄력적IP주소]

# 예시:
ssh -i ~/Downloads/donggamerank-key.pem ec2-user@13.125.xxx.xxx
```

처음 접속 시 `Are you sure you want to continue connecting?` → `yes` 입력

접속 성공 시 아래와 같은 화면이 나옵니다:
```
   ,     #_
   ~\_  ####_        Amazon Linux 2023
  ~~  \_#####\
  ~~     \###|
  ~~       \#/ ___   https://aws.amazon.com/linux/amazon-linux-2023
   ~~       V~' '->
    ~~~         /
      ~~._.   _/
         _/ _/
       _/m/'
[ec2-user@ip-xxx-xxx-xxx-xxx ~]$
```

---

## 6. RDS 생성 (PostgreSQL)

> 데이터베이스 서버를 만듭니다.

### 6-1. RDS용 보안 그룹 생성

1. EC2 → 보안 그룹 → **"보안 그룹 생성"**
2. 설정:
   - 이름: `donggamerank-rds-sg`
   - 설명: `Security group for DongGameRank RDS`
3. **인바운드 규칙:**

| 유형 | 포트 범위 | 소스 | 설명 |
|------|----------|------|------|
| PostgreSQL | 5432 | donggamerank-ec2-sg | EC2에서만 접근 허용 |

> 소스에서 "사용자 지정"을 선택하고 EC2 보안 그룹 ID를 입력합니다.

### 6-2. RDS 인스턴스 생성

1. AWS 콘솔 → 검색창에 **"RDS"** 검색 → RDS 대시보드
2. **"데이터베이스 생성"** 클릭
3. 설정:

| 항목 | 선택 |
|------|------|
| 데이터베이스 생성 방식 | **표준 생성** |
| 엔진 유형 | **PostgreSQL** |
| 엔진 버전 | 최신 PostgreSQL 15.x |
| 템플릿 | **프리 티어** ← 반드시 이것 선택! |
| DB 인스턴스 식별자 | `donggamerank-db` |
| 마스터 사용자 이름 | `postgres` |
| 마스터 암호 | 강력한 비밀번호 입력 (메모해두세요!) |

4. **인스턴스 구성:**
   - db.t3.micro (프리 티어)

5. **스토리지:**
   - 할당된 스토리지: **20 GiB**
   - 스토리지 자동 조정: **비활성화** (과금 방지)

6. **연결:**
   - VPC: 기본 VPC
   - 퍼블릭 액세스: **아니요** (보안상 EC2를 통해서만 접근)
   - 보안 그룹: `donggamerank-rds-sg` 선택
   - 가용 영역: 기본값

7. **추가 구성:**
   - 초기 데이터베이스 이름: `donggamerank`
   - 자동 백업: 활성화 (보존기간 7일, 무료)
   - 마이너 버전 자동 업그레이드: 활성화

8. **"데이터베이스 생성"** 클릭 (생성까지 5~10분 소요)

### 6-3. RDS 엔드포인트 확인

1. RDS 대시보드 → 데이터베이스 → `donggamerank-db` 클릭
2. **"연결 & 보안"** 탭에서 **엔드포인트** 복사
   - 예: `donggamerank-db.xxxxx.ap-northeast-2.rds.amazonaws.com`
3. 이 주소가 나중에 `DB_HOST` 환경변수에 들어갑니다

---

## 7. ElastiCache 생성 (Valkey)

> WebSocket 매칭, 세션 캐시 등에 사용할 Valkey를 만듭니다.
> Valkey는 Redis 7.2와 100% 호환되며 AWS가 공식 권장하는 오픈소스 엔진으로, Redis OSS보다 약 10~20% 저렴합니다.

### 7-1. ElastiCache용 보안 그룹 생성

1. EC2 → 보안 그룹 → **"보안 그룹 생성"**
2. 설정:
   - 이름: `donggamerank-redis-sg`
   - 설명: `Security group for DongGameRank Redis`
3. **인바운드 규칙:**

| 유형 | 포트 범위 | 소스 | 설명 |
|------|----------|------|------|
| 사용자 지정 TCP | 6379 | donggamerank-ec2-sg | EC2에서만 접근 허용 |

### 7-2. Valkey 캐시 생성

1. AWS 콘솔 → 검색창에 **"ElastiCache"** 검색
2. 좌측 메뉴 **"Valkey 캐시"** → **"Valkey 캐시 생성"**
   - AWS에서 "Valkey (저비용, 동일한 호환성)" 추천이 뜨면 **그대로 선택**하면 됩니다
3. 설정:

| 항목 | 선택 |
|------|------|
| 클러스터 모드 | **비활성화** |
| 이름 | `donggamerank-redis` |
| 엔진 버전 | 최신 Valkey 버전 |
| 노드 유형 | **cache.t3.micro** (프리 티어) |
| 복제본 수 | **0** (프리 티어에서는 복제본 없이 사용) |
| 서브넷 그룹 | 기본값 (새로 생성됨) |

4. **고급 설정:**
   - 보안 그룹: `donggamerank-redis-sg` 선택
   - 암호화: 비활성화 (Free Tier에서는 불필요)

5. **"생성"** 클릭 (생성까지 5~10분 소요)

### 7-3. Valkey 엔드포인트 확인

1. ElastiCache → Valkey 캐시 → `donggamerank-redis` 클릭
2. **기본 엔드포인트** 복사
   - 예: `donggamerank-redis.xxxxx.0001.apn2.cache.amazonaws.com`
3. 이 주소가 `REDIS_HOST` 환경변수에 들어갑니다

---

## 8. S3 + CloudFront (프론트엔드)

> React 빌드 파일을 S3에 올리고, CloudFront CDN으로 빠르게 전달합니다.

### 8-1. S3 버킷 생성

1. AWS 콘솔 → 검색창에 **"S3"** 검색
2. **"버킷 만들기"** 클릭
3. 설정:
   - 버킷 이름: `donggamerank-web` (전 세계에서 유일해야 함, 중복 시 다른 이름 사용)
   - 리전: **아시아 태평양 (서울)**
   - 객체 소유권: **ACL 비활성화됨**
   - 퍼블릭 액세스 차단: **모든 퍼블릭 액세스 차단** 체크 유지
     - CloudFront를 통해서만 접근하므로 S3 직접 접근은 차단
4. **"버킷 만들기"** 클릭

### 8-2. S3 정적 웹사이트 호스팅 설정

1. 생성된 버킷 클릭 → **"속성"** 탭
2. 맨 아래 **"정적 웹사이트 호스팅"** → **"편집"**
3. 설정:
   - 정적 웹사이트 호스팅: **활성화**
   - 인덱스 문서: `index.html`
   - 오류 문서: `index.html` (SPA 라우팅을 위해)
4. **"변경 사항 저장"**

### 8-3. CloudFront 배포 생성

1. AWS 콘솔 → 검색창에 **"CloudFront"** 검색
2. **"배포 생성"** 클릭
3. **원본 설정:**
   - 원본 도메인: S3 버킷 선택 (`donggamerank-web.s3.ap-northeast-2.amazonaws.com`)
   - 원본 액세스: **Origin Access Control 설정 (권장)** 선택
   - OAC 생성: **"컨트롤 설정 생성"** 클릭 → 기본값으로 생성

4. **기본 캐시 동작:**
   - 뷰어 프로토콜 정책: **Redirect HTTP to HTTPS**
   - 허용된 HTTP 메서드: **GET, HEAD**
   - 캐시 정책: **CachingOptimized**

5. **설정:**
   - 가격 분류: **북미, 유럽, 아시아, 중동 및 아프리카에서 사용** (또는 모든 엣지 로케이션)
   - 기본값 루트 객체: `index.html`

6. **"배포 생성"** 클릭

7. **중요!** 배포 생성 후 상단에 S3 버킷 정책 업데이트 안내가 나옵니다:
   - **"정책 복사"** 클릭
   - S3 버킷 → **"권한"** 탭 → **"버킷 정책"** 편집 → 복사한 정책 붙여넣기 → 저장

### 8-4. CloudFront에서 API 프록시 설정

> `/api`와 `/socket.io` 요청을 EC2 서버로 전달하는 설정입니다.

1. CloudFront 배포 → **"원본"** 탭 → **"원본 생성"**
2. 새 원본 설정:
   - 원본 도메인: EC2의 탄력적 IP 입력 (예: `13.125.xxx.xxx`)
   - 프로토콜: **HTTP만 해당**
   - HTTP 포트: `3000`
   - 원본 이름: `donggamerank-api`

3. **"동작"** 탭 → **"동작 생성"**

**API 동작:**
| 항목 | 값 |
|------|-----|
| 경로 패턴 | `/api/*` |
| 원본 | `donggamerank-api` (EC2) |
| 뷰어 프로토콜 | HTTPS only |
| 허용된 HTTP 메서드 | GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE |
| 캐시 정책 | CachingDisabled |
| 원본 요청 정책 | AllViewer |

**WebSocket 동작:**
| 항목 | 값 |
|------|-----|
| 경로 패턴 | `/socket.io/*` |
| 원본 | `donggamerank-api` (EC2) |
| 뷰어 프로토콜 | HTTPS only |
| 허용된 HTTP 메서드 | GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE |
| 캐시 정책 | CachingDisabled |
| 원본 요청 정책 | AllViewer |

### 8-5. SPA 라우팅을 위한 오류 페이지 설정

1. CloudFront 배포 → **"오류 페이지"** 탭
2. **"사용자 정의 오류 응답 생성"** 클릭
3. 설정:
   - HTTP 오류 코드: `403`
   - 오류 캐싱 최소 TTL: `0`
   - 사용자 정의 오류 응답: **예**
   - 응답 페이지 경로: `/index.html`
   - HTTP 응답 코드: `200`
4. **403과 404 모두** 같은 설정으로 만들어주세요 (React Router 라우팅용)

---

## 9. EC2 서버 환경 설정

> SSH로 EC2에 접속한 후, 서버 실행에 필요한 소프트웨어를 설치합니다.

### 9-1. SSH 접속

```bash
ssh -i ~/Downloads/donggamerank-key.pem ec2-user@[탄력적IP]
```

### 9-2. 시스템 업데이트

```bash
sudo dnf update -y
```

### 9-3. Node.js 20 설치

```bash
# Node.js 20 LTS 설치
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# 설치 확인
node --version   # v20.x.x
npm --version    # 10.x.x
```

### 9-4. Docker & Docker Compose 설치

```bash
# Docker 설치
sudo dnf install -y docker
sudo systemctl start docker
sudo systemctl enable docker

# ec2-user에게 Docker 권한 부여
sudo usermod -aG docker ec2-user

# Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 로그아웃 후 다시 접속 (Docker 권한 적용)
exit
ssh -i ~/Downloads/donggamerank-key.pem ec2-user@[탄력적IP]

# 설치 확인
docker --version
docker-compose --version
```

### 9-5. nginx 설치

```bash
sudo dnf install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 9-6. Git 설치 및 프로젝트 클론

```bash
# Git 설치 (보통 이미 설치되어 있음)
sudo dnf install -y git

# 프로젝트 클론
cd /home/ec2-user
git clone https://github.com/[your-username]/[your-repo].git donggamerank
cd donggamerank
```

### 9-7. 환경변수 설정

```bash
# 서버 환경변수 파일 생성
cat > /home/ec2-user/donggamerank/apps/server/.env << 'EOF'
# Database (RDS 엔드포인트 입력)
DB_HOST=donggamerank-db.xxxxx.ap-northeast-2.rds.amazonaws.com
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=여기에_RDS_비밀번호_입력
DB_NAME=donggamerank

# Auth (반드시 변경!)
JWT_SECRET=여기에_랜덤_문자열_입력_32자이상

# Redis (ElastiCache 엔드포인트 입력)
REDIS_HOST=donggamerank-redis.xxxxx.0001.apn2.cache.amazonaws.com
REDIS_PORT=6379

# Server
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://[CloudFront도메인].cloudfront.net

# External APIs (필요시 입력)
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
RIOT_API_KEY=your-riot-api-key
NEXON_API_KEY=your-nexon-api-key
EOF
```

> **JWT_SECRET 생성 팁:**
> ```bash
> openssl rand -hex 32
> ```
> 이 명령어로 안전한 랜덤 문자열을 생성할 수 있습니다.

---

## 10. 배포하기

### 방법 A: Docker로 배포 (권장)

프로젝트에 포함된 Docker 파일을 사용합니다.

```bash
cd /home/ec2-user/donggamerank

# Docker 이미지 빌드 및 실행
docker-compose -f docker-compose.prod.yml up -d --build

# 실행 확인
docker-compose -f docker-compose.prod.yml ps

# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f server
```

### 방법 B: 직접 실행

```bash
cd /home/ec2-user/donggamerank

# 의존성 설치
npm install

# 빌드
npm run build

# 서버 실행 (백그라운드)
cd apps/server
node dist/main &

# 또는 PM2 사용 (프로세스 매니저)
sudo npm install -g pm2
pm2 start dist/main.js --name donggamerank-server
pm2 save
pm2 startup  # 서버 재부팅 시 자동 시작
```

### 10-1. 프론트엔드 배포 (S3)

```bash
# 로컬 컴퓨터에서 실행 (EC2가 아님!)

# AWS CLI 설치 (아직 안 했다면)
# Mac: brew install awscli
# Windows: https://aws.amazon.com/cli/ 에서 다운로드

# AWS CLI 설정
aws configure
# AWS Access Key ID: IAM에서 생성한 키
# AWS Secret Access Key: IAM에서 생성한 시크릿 키
# Default region name: ap-northeast-2
# Default output format: json

# 프론트엔드 빌드
cd apps/web
npm run build

# S3에 업로드
aws s3 sync dist/ s3://donggamerank-web --delete

# CloudFront 캐시 무효화 (변경사항 즉시 반영)
aws cloudfront create-invalidation --distribution-id [배포ID] --paths "/*"
```

### 10-2. 배포 확인

1. CloudFront 도메인으로 접속: `https://xxxxx.cloudfront.net`
2. API 확인: `https://xxxxx.cloudfront.net/api` 에서 응답이 오는지 확인

---

## 11. 도메인 연결 (선택)

> 커스텀 도메인(예: donggamerank.com)을 사용하고 싶다면:

### 11-1. 도메인 구매

- AWS Route 53, 가비아(gabia.com), 또는 Namecheap에서 구매
- `.com` 도메인은 연간 약 $10~15

### 11-2. Route 53 설정

1. AWS → Route 53 → 호스팅 영역 생성
2. 도메인 네임서버를 Route 53으로 변경
3. CloudFront 배포에 대체 도메인 추가
4. ACM (Certificate Manager)에서 SSL 인증서 발급 (무료)

---

## 12. 모니터링 및 유지보수

### 12-1. 서버 상태 확인

```bash
# SSH 접속 후
# Docker 사용 시
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f

# PM2 사용 시
pm2 status
pm2 logs donggamerank-server
```

### 12-2. AWS 콘솔에서 모니터링

- **EC2**: 인스턴스 → 모니터링 탭 (CPU, 네트워크 사용량)
- **RDS**: 데이터베이스 → 모니터링 탭 (DB 연결 수, 스토리지)
- **ElastiCache**: 캐시 → 모니터링 탭
- **Billing**: 매일 확인! (비용 현황)

### 12-3. 서버 업데이트 배포

```bash
# SSH로 EC2 접속 후
cd /home/ec2-user/donggamerank
git pull origin main

# Docker 사용 시
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# PM2 사용 시
npm run build
pm2 restart donggamerank-server
```

---

## 13. 비용 절약 팁

### Free Tier 기간 중 (12개월)

1. **인스턴스는 1개씩만** - EC2, RDS, ElastiCache 각각 1개만 무료
2. **사용하지 않는 리소스 삭제** - 테스트로 만든 리소스는 바로 삭제
3. **Elastic IP는 반드시 연결** - 연결 안 하면 과금!
4. **스토리지 자동 확장 비활성화** - RDS에서 반드시 끄기
5. **데이터 전송량 주의** - 월 15GB 초과 시 과금

### Free Tier 종료 후

1. **EC2만 유지 + DB를 EC2 안에 설치** → 월 ~$10
2. **사용하지 않을 때 EC2 중지** → 중지 중에는 과금 없음 (EBS만 소액)
3. **스팟 인스턴스** 사용 → 최대 90% 할인 (개발/테스트용)
4. **Lightsail로 이전** → 고정 월 $3.50부터

---

## 14. 트러블슈팅

### Q: EC2에 SSH 접속이 안 됩니다
```
- 보안 그룹에서 22번 포트가 "내 IP"로 열려있는지 확인
- 키 파일 권한이 400인지 확인: chmod 400 donggamerank-key.pem
- 퍼블릭 IP/탄력적 IP가 올바른지 확인
- "내 IP"가 변경되었을 수 있음 → 보안 그룹에서 IP 업데이트
```

### Q: EC2에서 RDS에 연결이 안 됩니다
```
- RDS 보안 그룹에서 EC2 보안 그룹을 소스로 허용했는지 확인
- RDS 엔드포인트가 올바른지 확인
- 같은 VPC에 있는지 확인
- EC2에서 테스트: telnet [RDS엔드포인트] 5432
```

### Q: EC2에서 Redis에 연결이 안 됩니다
```
- ElastiCache 보안 그룹에서 EC2 보안 그룹을 허용했는지 확인
- Redis 엔드포인트가 올바른지 확인 (포트 번호 제외)
- EC2에서 테스트: telnet [Redis엔드포인트] 6379
```

### Q: 웹사이트가 안 열립니다
```
- CloudFront 배포 상태가 "Deployed"인지 확인 (배포 완료까지 15~30분)
- S3에 파일이 올바르게 업로드되었는지 확인
- S3 버킷 정책이 CloudFront OAC를 허용하는지 확인
- 브라우저 콘솔에서 에러 메시지 확인
```

### Q: API 호출이 실패합니다
```
- EC2에서 NestJS 서버가 실행 중인지 확인
- CloudFront에서 /api/* 동작이 EC2를 원본으로 가리키는지 확인
- EC2 보안 그룹에서 3000번 포트가 열려있는지 확인
- 서버 로그 확인: docker-compose logs -f server
```

### Q: 과금이 발생했습니다
```
1. AWS Billing → 청구서에서 어떤 서비스에서 과금됐는지 확인
2. 흔한 원인:
   - Elastic IP를 EC2에 연결 안 함
   - RDS/ElastiCache를 2개 이상 만듦
   - 다른 리전에 리소스가 남아있음
3. 불필요한 리소스 즉시 삭제
4. AWS Support에 문의하면 첫 과금은 면제해주는 경우가 많음
```

---

## 다음 단계

이 가이드를 완료했다면:

1. **CI/CD 파이프라인** 설정 → `.github/workflows/deploy.yml` 참고
2. **모니터링** 강화 → CloudWatch 알람 설정
3. **백업** 자동화 → RDS 자동 백업 + S3 버전 관리
4. **보안** 강화 → SSL 인증서, WAF 설정

궁금한 점이 있으면 언제든 질문하세요!
