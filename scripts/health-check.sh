#!/bin/bash

# SRE Console Styling
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${CYAN}🛡️  SYSTEM SENTINEL HEALTH INSPECTION ENROUTE...${NC}\n"

# Check frontend
echo -e "${YELLOW}[1/4] Inspecting Frontend Nginx server (port 3000)...${NC}"
frontend_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "FAILED")

if [ "$frontend_code" == "200" ] || [ "$frontend_code" == "304" ]; then
  echo -e "${GREEN}✓ Frontend is UP and responsive (HTTP $frontend_code)${NC}"
else
  echo -e "${RED}✗ Frontend is DOWN or unreachable (HTTP code: $frontend_code)${NC}"
fi

echo ""

# Check backend
echo -e "${YELLOW}[2/4] Inspecting Backend Express server (port 5000)...${NC}"
backend_health=$(curl -s http://localhost:5000/api/health || echo "FAILED")

if [ "$backend_health" == "FAILED" ]; then
  echo -e "${RED}✗ Backend server is DOWN or unreachable${NC}"
  exit 1
else
  echo -e "${GREEN}✓ Backend is UP and running${NC}"
fi

echo ""

# Check DB & Redis status from backend response
echo -e "${YELLOW}[3/4] Checking database connection status...${NC}"
if echo "$backend_health" | grep -q '"database":"UP"'; then
  echo -e "${GREEN}✓ MongoDB connection status: UP${NC}"
else
  echo -e "${RED}✗ MongoDB connection status: DOWN${NC}"
fi

echo ""

echo -e "${YELLOW}[4/4] Checking redis cache connection status...${NC}"
if echo "$backend_health" | grep -q '"cache":"UP"'; then
  echo -e "${GREEN}✓ Redis cache connection status: UP${NC}"
else
  echo -e "${RED}✗ Redis cache connection status: DOWN${NC}"
fi

echo ""
echo -e "${CYAN}===============================================${NC}"
if [[ "$frontend_code" == "200" || "$frontend_code" == "304" ]] && echo "$backend_health" | grep -q '"database":"UP"' && echo "$backend_health" | grep -q '"cache":"UP"'; then
  echo -e "${GREEN}🛡️  ALL CRITICAL CORE SERVICES HEALTHY!${NC}"
  echo -e "${CYAN}===============================================${NC}"
  exit 0
else
  echo -e "${RED}⚠️  HEALTH WARNING: ONE OR MORE SERVICES FAILED HEALTH INSPECTIONS!${NC}"
  echo -e "${CYAN}===============================================${NC}"
  exit 1
fi
