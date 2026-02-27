#!/bin/bash
# 서버 배포 스크립트
# EC2에서 실행: ./infra/scripts/deploy.sh
# 옵션:
#   --server    서버(백엔드)만 배포
#   --web       프론트엔드만 S3에 배포
#   (옵션 없음)  전체 배포

set -e

PROJECT_DIR="/home/ec2-user/donggamerank"
S3_BUCKET="donggamerank-web"

cd "$PROJECT_DIR"

deploy_server() {
    echo "=========================================="
    echo "  백엔드 서버 배포"
    echo "=========================================="

    echo "[1/3] 최신 코드 가져오기..."
    git pull origin main

    echo "[2/3] Docker 이미지 빌드 및 실행..."
    docker-compose -f docker-compose.prod.yml down
    docker-compose -f docker-compose.prod.yml up -d --build

    echo "[3/3] 헬스체크..."
    sleep 10
    if curl -sf http://localhost:3000/api > /dev/null 2>&1; then
        echo "서버 배포 성공!"
    else
        echo "경고: 서버가 아직 시작 중일 수 있습니다."
        echo "로그 확인: docker-compose -f docker-compose.prod.yml logs -f server"
    fi

    # 사용하지 않는 Docker 이미지 정리 (디스크 공간 확보)
    docker image prune -f
}

deploy_web() {
    echo "=========================================="
    echo "  프론트엔드 배포 (S3)"
    echo "=========================================="

    echo "[1/3] 최신 코드 가져오기..."
    git pull origin main

    echo "[2/3] 프론트엔드 빌드..."
    cd "$PROJECT_DIR"
    npm ci
    cd apps/web
    npx vite build

    echo "[3/3] S3 업로드..."
    aws s3 sync dist/ "s3://$S3_BUCKET" --delete

    echo ""
    echo "프론트엔드 배포 완료!"
    echo "CloudFront 캐시를 무효화하려면:"
    echo "  aws cloudfront create-invalidation --distribution-id [배포ID] --paths '/*'"
}

case "${1}" in
    --server)
        deploy_server
        ;;
    --web)
        deploy_web
        ;;
    *)
        deploy_server
        deploy_web
        ;;
esac

echo ""
echo "=========================================="
echo "  배포 완료!"
echo "=========================================="
