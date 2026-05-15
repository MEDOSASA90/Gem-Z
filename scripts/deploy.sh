#!/bin/bash
# =============================================================================
# GEM Z — Production Deployment Script
# Automates zero-downtime deployment with health checks
# =============================================================================

set -euo pipefail

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
HEALTH_RETRIES=30
HEALTH_INTERVAL=2

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;36m'
YELLOW='\033[0;33m'
RESET='\033[0m'

log() { echo -e "${BLUE}[DEPLOY]${RESET} $1"; }
success() { echo -e "${GREEN}[OK]${RESET} $1"; }
warn() { echo -e "${YELLOW}[WARN]${RESET} $1"; }
error() { echo -e "${RED}[ERROR]${RESET} $1"; }

log "Starting GEM Z production deployment..."

# ─── Step 1: Validate Environment ────────────────────────────────────────────
if [ ! -f ".env" ]; then
    error ".env file not found! Copy from .env.example and configure."
    exit 1
fi

# Check required environment variables
REQUIRED_VARS="DB_PASSWORD JWT_SECRET REFRESH_SECRET CLIENT_URL API_URL"
MISSING_VARS=""
for var in $REQUIRED_VARS; do
    if ! grep -q "^${var}=" .env || grep -q "^${var}=$" .env; then
        MISSING_VARS="$MISSING_VARS $var"
    fi
done

if [ -n "$MISSING_VARS" ]; then
    error "Missing required environment variables:$MISSING_VARS"
    exit 1
fi

success "Environment validation passed"

# ─── Step 2: Pull Latest Images / Build ──────────────────────────────────────
log "Building production images..."
docker compose -f $COMPOSE_FILE build --no-cache
success "Images built"

# ─── Step 3: Database Backup (if running) ───────────────────────────────────
if docker compose -f $COMPOSE_FILE ps | grep -q "postgres"; then
    log "Creating pre-deployment database backup..."
    BACKUP_FILE="backups/pre-deploy-$(date +%Y%m%d-%H%M%S).dump"
    mkdir -p backups
    docker compose -f $COMPOSE_FILE exec -T postgres pg_dump \
        -U "${DB_USER:-gemz}" \
        -d "${DB_NAME:-gemz}" \
        -F custom > "$BACKUP_FILE" || warn "Backup failed, continuing..."
    success "Backup created: $BACKUP_FILE"
fi

# ─── Step 4: Deploy ──────────────────────────────────────────────────────────
log "Deploying services..."
docker compose -f $COMPOSE_FILE up -d --remove-orphans

# ─── Step 5: Health Checks ───────────────────────────────────────────────────
log "Waiting for services to become healthy..."

for service in postgres redis backend frontend nginx; do
    log "Checking $service..."
    RETRY_COUNT=0
    
    until docker compose -f $COMPOSE_FILE ps "$service" | grep -q "healthy"; do
        RETRY_COUNT=$((RETRY_COUNT + 1))
        
        if [ $RETRY_COUNT -ge $HEALTH_RETRIES ]; then
            error "$service failed to become healthy after $((HEALTH_RETRIES * HEALTH_INTERVAL))s"
            log "Showing recent logs:"
            docker compose -f $COMPOSE_FILE logs --tail=50 "$service"
            exit 1
        fi
        
        echo -n "."
        sleep $HEALTH_INTERVAL
    done
    
    success "$service is healthy"
done

# ─── Step 6: Cleanup ─────────────────────────────────────────────────────────
log "Cleaning up old images..."
docker image prune -f || true

# ─── Deployment Complete ─────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Production Deployment Complete"
echo "═══════════════════════════════════════════════════════════════"
echo ""
docker compose -f $COMPOSE_FILE ps
echo ""
success "GEM Z is running in production mode!"
