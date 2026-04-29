#!/bin/bash

# --- OTL VPS SETUP SCRIPT ---
# This script sets up Node.js, PM2, and your application on a fresh Ubuntu server.

echo "🚀 Starting OTL System Setup..."

# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js (v20)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -bash -
sudo apt-get install -y nodejs

# 3. Install PM2 (Process Manager)
sudo npm install -g pm2

# 4. Navigate to project folder (Assume you've uploaded the code)
# cd /path/to/your/project

# 5. Install dependencies
npm install

# 6. Start the Backend Server
echo "📂 Starting Backend Server..."
pm2 start server/index.cjs --name "otl-backend"

# 7. Start the Frontend (Vite Preview or Build)
echo "🌐 Starting Frontend Server..."
# For development on VPS:
# pm2 start "npm run dev -- --host" --name "otl-frontend"

# For production (Recommended):
npm run build
pm2 serve dist 5173 --spa --name "otl-frontend"

# 8. Save PM2 list
pm2 save
pm2 startup

echo "✅ Setup Complete!"
echo "Backend: http://your-vps-ip:5000"
echo "Frontend: http://your-vps-ip:5173"
