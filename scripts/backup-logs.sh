#!/bin/bash

# Exit on error
set -e

# SRE Console Styling
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${CYAN}🛡️  SYSTEM SENTINEL LOGS ROTATION & BACKUP IN PROGRESS...${NC}\n"

# Directory configs
LOG_FILE="backend/logs/application.log"
BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/application-log-${TIMESTAMP}.tar.gz"

# Verify log file exists
if [ ! -f "$LOG_FILE" ]; then
  echo -e "${RED}Error: Log file not found at ${LOG_FILE}.${NC}"
  echo "Nothing to backup."
  exit 1
fi

# Get current file size
FILE_SIZE=$(du -h "$LOG_FILE" | cut -f1)

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}Compressing application log (${FILE_SIZE}) -> ${BACKUP_FILE}...${NC}"
tar -czf "$BACKUP_FILE" "$LOG_FILE"

# Truncate original log file to reclaim disk space
echo -e "${YELLOW}Truncating active application log to reclaim disk space...${NC}"
cat /dev/null > "$LOG_FILE"

echo -e "${GREEN}✓ Backup successfully archived!${NC}"
echo -e "Archive location: ${CYAN}${BACKUP_FILE}${NC}"
echo -e "Original log size cleared: ${GREEN}${FILE_SIZE}${NC}"
echo -e "New log file size: ${GREEN}$(du -h "$LOG_FILE" | cut -f1)${NC}"
