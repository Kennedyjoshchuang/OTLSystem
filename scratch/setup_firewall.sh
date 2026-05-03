#!/bin/bash
# OTL System - Firewall Configuration Script
# Run this on your VPS: bash setup_firewall.sh

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Configuring UFW Firewall...${NC}"

# 1. Allow SSH (Critical to prevent lockout)
echo -e "${YELLOW}Allowing SSH (Port 22)...${NC}"
ufw allow 22/tcp

# 2. Allow Nginx (HTTP & HTTPS)
echo -e "${YELLOW}Allowing Nginx (Ports 80 & 443)...${NC}"
ufw allow 'Nginx Full'

# 3. Deny direct access to Node.js backend (Security best practice)
# We access the API through Nginx reverse proxy on Port 80/api
echo -e "${YELLOW}Closing direct access to Port 5000 (API will go through Nginx)...${NC}"
ufw deny 5000/tcp

# 4. Enable Firewall
echo -e "${YELLOW}Enabling Firewall...${NC}"
ufw --force enable

# 5. Show Status
echo -e "\n${GREEN}Firewall Setup Complete!${NC}"
ufw status verbose
