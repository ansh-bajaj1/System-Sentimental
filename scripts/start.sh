#!/bin/bash

# Exit on error
set -e

# SRE Console Styling
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "=========================================================="
echo "    🛡️   SYSTEM SENTINEL MONITORING ENGINE BOOTSTRAP    "
echo "=========================================================="
echo -e "${NC}"

# Check if Docker is installed
if ! [ -x "$(command -v docker)" ]; then
  echo -e "${RED}Error: Docker is not installed. Please install Docker and try again.${NC}" >&2
  exit 1
fi

# Check if Docker Compose is installed
if ! [ -x "$(command -v docker-compose)" ] && ! docker compose version &>/dev/null; then
  echo -e "${RED}Error: Docker Compose is not installed. Please install Docker Compose and try again.${NC}" >&2
  exit 1
fi

# Check if Docker daemon is running
if ! docker info &>/dev/null; then
  echo -e "${RED}Error: Docker daemon is not running. Please start Docker and try again.${NC}" >&2
  exit 1
fi

echo -e "${YELLOW}[1/3] Creating logs directory...${NC}"
mkdir -p backend/logs

echo -e "${YELLOW}[2/3] Building and starting services with Docker Compose...${NC}"
if docker compose version &>/dev/null; then
  docker compose up --build -d
else
  docker-compose up --build -d
fi

echo -e "${YELLOW}[3/3] Checking server statuses...${NC}"
sleep 5

echo -e "${GREEN}"
echo "=========================================================="
echo "      🛡️   SYSTEM SENTINEL SERVICES ACTIVE NOW!         "
echo "=========================================================="
echo -e "${NC}"
echo -e "Frontend Cockpit:    ${CYAN}http://localhost:3000${NC}"
echo -e "Backend Express API: ${CYAN}http://localhost:5000${NC}"
echo -e "Prometheus Metrics:  ${CYAN}http://localhost:9090${NC}"
echo -e "Grafana Dashboard:   ${CYAN}http://localhost:3001${NC} (Creds: admin/admin)"
echo -e "MongoDB Port:        ${CYAN}27017${NC}"
echo -e "Redis Port:          ${CYAN}6379${NC}"
echo ""
echo -e "Run health inspection using: ${YELLOW}./scripts/health-check.sh${NC}"
echo "=========================================================="
