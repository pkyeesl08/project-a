#!/bin/bash
# EC2 초기 환경 설정 스크립트
# 사용법: ssh로 EC2 접속 후 이 스크립트를 실행
# curl -sSL https://raw.githubusercontent.com/[REPO]/main/infra/scripts/ec2-init.sh | bash

set -e

echo "=========================================="
echo "  DongGameRank EC2 초기 설정 시작"
echo "=========================================="

# 1. 시스템 업데이트
echo ""
echo "[1/5] 시스템 업데이트 중..."
sudo dnf update -y

# 2. Docker 설치
echo ""
echo "[2/5] Docker 설치 중..."
sudo dnf install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# 3. Docker Compose 설치
echo ""
echo "[3/5] Docker Compose 설치 중..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 4. Git 설치
echo ""
echo "[4/5] Git 설치 중..."
sudo dnf install -y git

# 5. 프로젝트 디렉토리 생성
echo ""
echo "[5/5] 프로젝트 디렉토리 생성 중..."
mkdir -p /home/ec2-user/donggamerank

echo ""
echo "=========================================="
echo "  초기 설정 완료!"
echo "=========================================="
echo ""
echo "다음 단계:"
echo "1. 로그아웃 후 다시 접속하세요 (Docker 권한 적용)"
echo "   exit"
echo "   ssh -i donggamerank-key.pem ec2-user@[IP]"
echo ""
echo "2. 프로젝트를 클론하세요:"
echo "   cd /home/ec2-user"
echo "   git clone https://github.com/[USERNAME]/[REPO].git donggamerank"
echo ""
echo "3. 환경변수를 설정하세요:"
echo "   cp donggamerank/apps/server/.env.example donggamerank/apps/server/.env"
echo "   vi donggamerank/apps/server/.env"
echo ""
echo "4. 서버를 시작하세요:"
echo "   cd donggamerank"
echo "   docker-compose -f docker-compose.prod.yml up -d --build"
echo ""
