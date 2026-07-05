.PHONY: dev build test lint clean docker-up docker-down help

# Default target
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Development
dev: ## Start all services in development mode
	docker compose -f docker/docker-compose.yml up -d postgres redis
	npm run dev:server

dev-desktop: ## Start desktop app in development mode
	npm run dev:desktop

dev-mobile: ## Start mobile app in development mode
	npm run dev:mobile

# Build
build: ## Build all packages
	npm run build

build-server: ## Build server only
	npm run build:shared
	npm run build:server

build-desktop: ## Build desktop app only
	npm run build:shared
	npm run build:desktop

# Test
test: ## Run all tests
	npm test

test-watch: ## Run tests in watch mode
	npm run test:watch

test-coverage: ## Run tests with coverage
	npm run test:coverage

# Lint
lint: ## Run linter
	npm run lint

lint-fix: ## Run linter with auto-fix
	npm run lint:fix

# Type check
typecheck: ## Run TypeScript type checking
	npm run typecheck

# Docker
docker-up: ## Start Docker services
	docker compose -f docker/docker-compose.yml up -d

docker-down: ## Stop Docker services
	docker compose -f docker/docker-compose.yml down

docker-build: ## Build Docker images
	docker compose -f docker/docker-compose.yml build

docker-logs: ## View Docker logs
	docker compose -f docker/docker-compose.yml logs -f

# Database
db-migrate: ## Run database migrations
	npm run migrate -w apps/server

db-rollback: ## Rollback last migration
	npm run migrate:rollback -w apps/server

# Clean
clean: ## Clean all build artifacts and node_modules
	npm run clean

# Setup
setup: ## Initial project setup
	npm install
	npm run build:shared
	docker compose -f docker/docker-compose.yml up -d postgres redis
	sleep 5
	npm run migrate -w apps/server

# Production
prod-build: ## Build for production
	NODE_ENV=production npm run build

prod-start: ## Start production server
	NODE_ENV=production npm start -w apps/server

# Flutter
flutter-setup: ## Setup Flutter app
	cd apps/mobile && flutter pub get

flutter-build: ## Build Flutter app
	cd apps/mobile && flutter build apk --release

flutter-test: ## Run Flutter tests
	cd apps/mobile && flutter test
