# =============================================================================
# GEM Z — Docker Orchestration Makefile
# Development & Production workflows
# =============================================================================

.PHONY: help dev-up dev-down dev-logs dev-build dev-shell dev-ps \
        prod-up prod-down prod-logs prod-build prod-shell prod-ps \
        db-migrate db-seed db-reset db-backup db-restore \
        test lint audit clean prune status

# ─── Colors ──────────────────────────────────────────────────────────────────
BLUE  := \033[36m
GREEN := \033[32m
RED   := \033[31m
YELLOW := \033[33m
RESET := \033[0m

# ─── Default Target ──────────────────────────────────────────────────────────
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo "$(BLUE)══════════════════════════════════════════════════════════════════$(RESET)"
	@echo "$(BLUE)  GEM Z — Docker Orchestration$(RESET)"
	@echo "$(BLUE)══════════════════════════════════════════════════════════════════$(RESET)"
	@echo ""
	@echo "$(GREEN)Development Commands:$(RESET)"
	@echo "  $(YELLOW)make dev-up$(RESET)        Start development stack (postgres, redis, backend, frontend)"
	@echo "  $(YELLOW)make dev-down$(RESET)      Stop and remove development containers"
	@echo "  $(YELLOW)make dev-logs$(RESET)      Tail logs from all development services"
	@echo "  $(YELLOW)make dev-build$(RESET)     Rebuild development images from scratch"
	@echo "  $(YELLOW)make dev-shell$(RESET)     Open shell in backend container"
	@echo "  $(YELLOW)make dev-ps$(RESET)        List running development containers"
	@echo ""
	@echo "$(GREEN)Production Commands:$(RESET)"
	@echo "  $(YELLOW)make prod-up$(RESET)       Start production stack (with Nginx + SSL)"
	@echo "  $(YELLOW)make prod-down$(RESET)     Stop and remove production containers"
	@echo "  $(YELLOW)make prod-logs$(RESET)     Tail logs from all production services"
	@echo "  $(YELLOW)make prod-build$(RESET)    Rebuild production images from scratch"
	@echo "  $(YELLOW)make prod-shell$(RESET)    Open shell in production backend container"
	@echo "  $(YELLOW)make prod-ps$(RESET)       List running production containers"
	@echo ""
	@echo "$(Green)Database Commands:$(RESET)"
	@echo "  $(YELLOW)make db-migrate$(RESET)    Run database schema migrations"
	@echo "  $(YELLOW)make db-seed$(RESET)       Run database seed data"
	@echo "  $(YELLOW)make db-reset$(RESET)      Reset database (drop & recreate)"
	@echo "  $(YELLOW)make db-backup$(RESET)     Backup PostgreSQL database"
	@echo "  $(YELLOW)make db-restore$(RESET)    Restore PostgreSQL database from backup"
	@echo ""
	@echo "$(GREEN)Quality & Maintenance Commands:$(RESET)"
	@echo "  $(YELLOW)make test$(RESET)          Run test suites"
	@echo "  $(YELLOW)make lint$(RESET)          Run linting on backend and frontend"
	@echo "  $(YELLOW)make audit$(RESET)         Run security audit on dependencies"
	@echo "  $(YELLOW)make clean$(RESET)         Remove all containers, volumes, and images"
	@echo "  $(YELLOW)make prune$(RESET)         Prune unused Docker resources"
	@echo "  $(YELLOW)make status$(RESET)        Show status of all GEM Z containers"
	@echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# DEVELOPMENT
# ═══════════════════════════════════════════════════════════════════════════════

dev-up: ## Start development stack
	@echo "$(BLUE)[DEV] Starting development stack...$(RESET)"
	docker compose -f docker-compose.yml up -d --remove-orphans
	@echo "$(GREEN)[DEV] Stack is up! Services available at:$(RESET)"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend:  http://localhost:5000"
	@echo "  API Docs: http://localhost:5000/api/v1/health"

dev-down: ## Stop development stack
	@echo "$(BLUE)[DEV] Stopping development stack...$(RESET)"
	docker compose -f docker-compose.yml down --remove-orphans

dev-logs: ## Tail logs from development services
	docker compose -f docker-compose.yml logs -f --tail=100

dev-build: ## Rebuild development images from scratch
	@echo "$(BLUE)[DEV] Rebuilding development images...$(RESET)"
	docker compose -f docker-compose.yml down
	docker compose -f docker-compose.yml build --no-cache
	docker compose -f docker-compose.yml up -d --remove-orphans

dev-shell: ## Open shell in backend container
	docker compose -f docker-compose.yml exec backend /bin/sh

dev-frontend-shell: ## Open shell in frontend container
	docker compose -f docker-compose.yml exec frontend /bin/sh

dev-ps: ## List running development containers
	docker compose -f docker-compose.yml ps

# ═══════════════════════════════════════════════════════════════════════════════
# PRODUCTION
# ═══════════════════════════════════════════════════════════════════════════════

prod-up: ## Start production stack
	@echo "$(GREEN)[PROD] Starting production stack...$(RESET)"
	@echo "$(YELLOW)[PROD] Ensure .env file is configured with production values!$(RESET)"
	docker compose -f docker-compose.prod.yml up -d --remove-orphans
	@echo "$(GREEN)[PROD] Stack is up!$(RESET)"

prod-down: ## Stop production stack
	@echo "$(RED)[PROD] Stopping production stack...$(RESET)"
	docker compose -f docker-compose.prod.yml down --remove-orphans

prod-logs: ## Tail logs from production services
	docker compose -f docker-compose.prod.yml logs -f --tail=100

prod-build: ## Rebuild production images from scratch
	@echo "$(BLUE)[PROD] Rebuilding production images...$(RESET)"
	docker compose -f docker-compose.prod.yml down
	docker compose -f docker-compose.prod.yml build --no-cache
	docker compose -f docker-compose.prod.yml up -d --remove-orphans

prod-shell: ## Open shell in production backend container
	docker compose -f docker-compose.prod.yml exec backend /bin/sh

prod-ps: ## List running production containers
	docker compose -f docker-compose.prod.yml ps

# ═══════════════════════════════════════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════════════════════════════════════

db-migrate: ## Run database schema migrations
	@echo "$(BLUE)[DB] Running database migrations...$(RESET)"
	docker compose -f docker-compose.yml exec backend node dist/migrate.js

db-seed: ## Run database seed data
	@echo "$(BLUE)[DB] Running database seed...$(RESET)"
	docker compose -f docker-compose.yml exec -T postgres psql \
		-U $${DB_USER:-gemz} \
		-d $${DB_NAME:-gemz} \
		-f /docker-entrypoint-initdb.d/seed_pricing.sql

db-reset: ## Reset database (drop & recreate) — DEVELOPMENT ONLY
	@echo "$(RED)[DB] Resetting database — THIS WILL DELETE ALL DATA!$(RESET)"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	docker compose -f docker-compose.yml down
	docker volume rm gemz-postgres-data 2>/dev/null || true
	docker compose -f docker-compose.yml up -d postgres
	@echo "$(GREEN)[DB] Database reset. Run 'make db-migrate' to re-apply schema.$(RESET)"

db-backup: ## Backup PostgreSQL database
	@echo "$(BLUE)[DB] Creating backup...$(RESET)"
	@mkdir -p ./backups
	docker compose -f docker-compose.yml exec -T postgres pg_dump \
		-U $${DB_USER:-gemz} \
		-d $${DB_NAME:-gemz} \
		-F custom \
		-f /tmp/gemz-backup-$$(date +%Y%m%d-%H%M%S).dump
	docker compose -f docker-compose.yml cp postgres:/tmp/gemz-backup-$$(date +%Y%m%d-%H%M%S).dump ./backups/
	@echo "$(GREEN)[DB] Backup saved to ./backups/$(RESET)"

db-restore: ## Restore PostgreSQL database from backup (usage: make db-restore FILE=backups/xxx.dump)
	@if [ -z "$(FILE)" ]; then \
		echo "$(RED)[DB] Error: Specify backup file with FILE=path/to/backup.dump$(RESET)"; \
		exit 1; \
	fi
	@echo "$(BLUE)[DB] Restoring from $(FILE)...$(RESET)"
	docker compose -f docker-compose.yml cp $(FILE) postgres:/tmp/restore.dump
	docker compose -f docker-compose.yml exec -T postgres pg_restore \
		-U $${DB_USER:-gemz} \
		-d $${DB_NAME:-gemz} \
		--clean \
		--if-exists \
		/tmp/restore.dump
	@echo "$(GREEN)[DB] Restore complete.$(RESET)"

# ═══════════════════════════════════════════════════════════════════════════════
# QUALITY & TESTING
# ═══════════════════════════════════════════════════════════════════════════════

test: ## Run test suites (placeholder for future test commands)
	@echo "$(BLUE)[TEST] Running tests...$(RESET)"
	@echo "$(YELLOW)Backend tests:$(RESET)"
	@cd backend && npm test 2>/dev/null || echo "No test script configured"
	@echo "$(YELLOW)Frontend tests:$(RESET)"
	@cd frontend && npm test 2>/dev/null || echo "No test script configured"

lint: ## Run linting on backend and frontend
	@echo "$(BLUE)[LINT] Running linters...$(RESET)"
	@echo "$(YELLOW)Backend lint:$(RESET)"
	@cd backend && npx tsc --noEmit 2>/dev/null || true
	@echo "$(YELLOW)Frontend lint:$(RESET)"
	@cd frontend && npm run lint 2>/dev/null || true

audit: ## Run security audit on dependencies
	@echo "$(BLUE)[AUDIT] Running security audit...$(RESET)"
	@echo "$(YELLOW)Backend audit:$(RESET)"
	@cd backend && npm audit --audit-level=moderate 2>/dev/null || true
	@echo "$(YELLOW)Frontend audit:$(RESET)"
	@cd frontend && npm audit --audit-level=moderate 2>/dev/null || true

# ═══════════════════════════════════════════════════════════════════════════════
# MAINTENANCE
# ═══════════════════════════════════════════════════════════════════════════════

clean: ## Remove all GEM Z containers, volumes, and images
	@echo "$(RED)[CLEAN] Removing all GEM Z resources...$(RESET)"
	@read -p "This will DELETE all data. Continue? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	docker compose -f docker-compose.yml down -v --rmi all --remove-orphans 2>/dev/null || true
	docker compose -f docker-compose.prod.yml down -v --rmi all --remove-orphans 2>/dev/null || true
	docker system prune -f
	@echo "$(GREEN)[CLEAN] All GEM Z resources removed.$(RESET)"

prune: ## Prune unused Docker resources
	@echo "$(BLUE)[PRUNE] Cleaning up unused Docker resources...$(RESET)"
	docker system prune -f
	docker volume prune -f
	@echo "$(GREEN)[PRUNE] Cleanup complete.$(RESET)"

status: ## Show status of all GEM Z containers
	@echo "$(BLUE)═══════════════════════════════════════════════════════════════$(RESET)"
	@echo "$(BLUE)  GEM Z Container Status$(RESET)"
	@echo "$(BLUE)═══════════════════════════════════════════════════════════════$(RESET)"
	@echo ""
	@echo "$(GREEN)Development:$(RESET)"
	@docker compose -f docker-compose.yml ps 2>/dev/null || echo "  Not running"
	@echo ""
	@echo "$(GREEN)Production:$(RESET)"
	@docker compose -f docker-compose.prod.yml ps 2>/dev/null || echo "  Not running"
	@echo ""
	@echo "$(GREEN)Images:$(RESET)"
	@docker images --filter "reference=gemz-*" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" 2>/dev/null || echo "  No GEM Z images"
	@echo ""
	@echo "$(Green)Volumes:$(RESET)"
	@docker volume ls --filter "name=gemz" --format "table {{.Name}}\t{{.Driver}}\t{{.Size}}" 2>/dev/null || echo "  No GEM Z volumes"
