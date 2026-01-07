.PHONY: help dev up down logs build clean db-migrate db-seed test lint format

# Default target
help:
	@echo "Music Publishing System - Development Commands"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Development:"
	@echo "  dev          Start all services in development mode"
	@echo "  up           Start infrastructure (db, redis, kafka)"
	@echo "  down         Stop all services"
	@echo "  logs         Tail logs from all services"
	@echo "  build        Build all Docker images"
	@echo "  clean        Remove all containers, volumes, and images"
	@echo ""
	@echo "Database:"
	@echo "  db-migrate   Run database migrations"
	@echo "  db-seed      Seed database with test data"
	@echo "  db-reset     Reset database (drop, create, migrate, seed)"
	@echo "  db-shell     Open psql shell"
	@echo ""
	@echo "Testing:"
	@echo "  test         Run all tests"
	@echo "  test-auth    Run auth service tests"
	@echo "  test-works   Run works service tests"
	@echo ""
	@echo "Code Quality:"
	@echo "  lint         Run linters"
	@echo "  format       Format code"
	@echo ""
	@echo "Frontend:"
	@echo "  admin        Start admin portal dev server"
	@echo "  portal       Start songwriter portal dev server"

# Development
dev:
	docker-compose -f docker-compose.dev.yml up --build

up:
	docker-compose -f docker-compose.dev.yml up -d postgres redis zookeeper kafka kafka-ui

down:
	docker-compose -f docker-compose.dev.yml down

logs:
	docker-compose -f docker-compose.dev.yml logs -f

build:
	docker-compose -f docker-compose.dev.yml build

clean:
	docker-compose -f docker-compose.dev.yml down -v --rmi local
	docker system prune -f

# Database
db-migrate:
	@echo "Running init.sql..."
	docker-compose -f docker-compose.dev.yml exec -T postgres psql -U musicpub -d musicpub < db/init.sql
	@for file in db/migrations/*.sql; do \
		echo "Running migration: $$file"; \
		docker-compose -f docker-compose.dev.yml exec -T postgres psql -U musicpub -d musicpub < $$file; \
	done
	@echo "Migrations complete!"

db-seed:
	@echo "Seeding database..."
	docker-compose -f docker-compose.dev.yml exec -T postgres psql -U musicpub -d musicpub < db/seeds/seed_data.sql
	@echo "Seeding complete!"

db-reset:
	docker-compose -f docker-compose.dev.yml exec postgres dropdb -U musicpub --if-exists musicpub
	docker-compose -f docker-compose.dev.yml exec postgres createdb -U musicpub musicpub
	$(MAKE) db-migrate
	$(MAKE) db-seed

db-shell:
	docker-compose -f docker-compose.dev.yml exec postgres psql -U musicpub -d musicpub

# Testing
test:
	@echo "Running all tests..."
	cd services/auth && pytest
	cd services/works && pytest

test-auth:
	cd services/auth && pytest -v

test-works:
	cd services/works && pytest -v

# Code Quality
lint:
	@echo "Running linters..."
	cd services/auth && ruff check .
	cd services/works && ruff check .
	cd apps/admin-portal && npm run lint
	cd apps/songwriter-portal && npm run lint

format:
	@echo "Formatting code..."
	cd services/auth && ruff format .
	cd services/works && ruff format .
	cd apps/admin-portal && npm run format
	cd apps/songwriter-portal && npm run format

# Frontend
admin:
	cd apps/admin-portal && npm run dev

portal:
	cd apps/songwriter-portal && npm run dev

# Kafka
kafka-topics:
	docker-compose -f docker-compose.dev.yml exec kafka kafka-topics --create --if-not-exists --bootstrap-server localhost:9092 --replication-factor 1 --partitions 3 --topic usage.raw.spotify
	docker-compose -f docker-compose.dev.yml exec kafka kafka-topics --create --if-not-exists --bootstrap-server localhost:9092 --replication-factor 1 --partitions 3 --topic usage.raw.apple_music
	docker-compose -f docker-compose.dev.yml exec kafka kafka-topics --create --if-not-exists --bootstrap-server localhost:9092 --replication-factor 1 --partitions 3 --topic usage.raw.radio
	docker-compose -f docker-compose.dev.yml exec kafka kafka-topics --create --if-not-exists --bootstrap-server localhost:9092 --replication-factor 1 --partitions 3 --topic usage.raw.generic
	docker-compose -f docker-compose.dev.yml exec kafka kafka-topics --create --if-not-exists --bootstrap-server localhost:9092 --replication-factor 1 --partitions 3 --topic usage.normalized
	docker-compose -f docker-compose.dev.yml exec kafka kafka-topics --create --if-not-exists --bootstrap-server localhost:9092 --replication-factor 1 --partitions 3 --topic usage.matched
	docker-compose -f docker-compose.dev.yml exec kafka kafka-topics --create --if-not-exists --bootstrap-server localhost:9092 --replication-factor 1 --partitions 3 --topic usage.unmatched
	docker-compose -f docker-compose.dev.yml exec kafka kafka-topics --create --if-not-exists --bootstrap-server localhost:9092 --replication-factor 1 --partitions 3 --topic dlq.usage.processing

kafka-list:
	docker-compose -f docker-compose.dev.yml exec kafka kafka-topics --list --bootstrap-server localhost:9092

# Install dependencies
install:
	cd packages/shared/types && npm install
	cd packages/shared/api-client && npm install
	cd apps/admin-portal && npm install
	cd apps/songwriter-portal && npm install
