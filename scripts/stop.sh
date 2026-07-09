#!/bin/bash

# SRE Console Styling
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "=========================================================="
echo "    🛡️      SHUTTING DOWN SYSTEM SENTINEL COCKPIT       "
echo "=========================================================="
echo -e "${NC}"

echo -e "${YELLOW}Stopping docker containers and cleaning networks...${NC}"
if docker compose version &>/dev/null; then
  docker compose down
else
  docker-compose down
fi

echo -e "${GREEN}"
echo "=========================================================="
echo "    🛡️      ALL SENTINEL CONTAINERS DISMANTLED!         "
echo "=========================================================="
echo -e "${NC}"
