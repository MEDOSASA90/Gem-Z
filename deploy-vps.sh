#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════╗
# ║  Gem Z — VPS Deployment Script (Run on your Hostinger VPS)     ║
# ║                                                                  ║
# ║  Usage:                                                          ║
# ║    curl -sSL https://raw.githubusercontent.com/MEDOSASA90/     ║
# ║           Gem-Z/staging/deploy-vps.sh | bash                   ║
# ║                                                                  ║
# ║  Or manually:                                                    ║
# ║    bash <(curl -sSL https://raw.githubusercontent.com/          ║
# ║          MEDOSASA90/Gem-Z/staging/deploy-vps.sh)               ║
# ╚══════════════════════════════════════════════════════════════════╝

set -e

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  Gem Z — VPS Deployment                                        ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# ─── Configuration ─────────────────────────────────────────────────
APP_DIR="/opt/gemz"
BACKUP_DIR="/opt/gemz-backup-$(date +%Y%m%d-%H%M%S)"
REPO_URL="https://github.com/MEDOSASA90/Gem-Z.git"
BRANCH="staging"
PM2_APP_NAME="gemz-api"
NODE_VERSION="20"

# ─── Colors ────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ─── Functions ─────────────────────────────────────────────────────
log_step() {
    echo ""
    echo -e "${CYAN}Step $1/8: $2${NC}"
    echo "─────────────────────────────────────────────────────────────────"
}

log_success() {
    echo -e "${GREEN}  ✅ $1${NC}"
}

log_error() {
    echo -e "${RED}  ❌ $1${NC}"
}

log_info() {
    echo -e "${YELLOW}  ℹ️  $1${NC}"
}

# ─── Step 1: System Check ──────────────────────────────────────────
log_step "1" "System Check"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root (use sudo)"
    exit 1
fi

# Check Node.js
if command -v node &> /dev/null; then
    NODE_CURRENT=$(node --version | sed 's/v//')
    log_success "Node.js found: v$NODE_CURRENT"
else
    log_info "Node.js not found. Installing Node.js $NODE_VERSION..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
    log_success "Node.js installed: $(node --version)"
fi

# Check npm
if command -v npm &> /dev/null; then
    log_success "npm found: $(npm --version)"
else
    log_error "npm not found"
    exit 1
fi

# Check git
if command -v git &> /dev/null; then
    log_success "git found: $(git --version)"
else
    log_info "Installing git..."
    apt-get update && apt-get install -y git
    log_success "git installed"
fi

# Check PM2
if command -v pm2 &> /dev/null; then
    log_success "PM2 found: $(pm2 --version)"
else
    log_info "Installing PM2..."
    npm install -g pm2
    log_success "PM2 installed"
fi

# Check PostgreSQL
if command -v psql &> /dev/null; then
    log_success "PostgreSQL found"
else
    log_info "PostgreSQL not found. Please install and configure first."
    log_info "Run: apt-get install postgresql postgresql-contrib"
    exit 1
fi

# ─── Step 2: Backup ────────────────────────────────────────────────
log_step "2" "Backup Current Version"

if [ -d "$APP_DIR" ]; then
    log_info "Backing up current version to $BACKUP_DIR..."
    cp -r "$APP_DIR" "$BACKUP_DIR"
    log_success "Backup created at $BACKUP_DIR"
else
    log_info "No existing installation found. Fresh install."
    mkdir -p "$APP_DIR"
fi

# ─── Step 3: Clone / Pull Code ─────────────────────────────────────
log_step "3" "Downloading Latest Code"

if [ -d "$APP_DIR/.git" ]; then
    log_info "Pulling latest changes..."
    cd "$APP_DIR"
    git fetch origin
    git reset --hard origin/$BRANCH
    git pull origin $BRANCH
else
    log_info "Cloning repository..."
    rm -rf "$APP_DIR"
    git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

log_success "Code updated to latest $BRANCH"

# ─── Step 4: Setup Environment ─────────────────────────────────────
log_step "4" "Setting Up Environment"

cd "$APP_DIR"

# Create .env if not exists
if [ ! -f "backend/.env" ]; then
    log_info "Creating .env file..."
    cp backend/.env.example backend/.env
    log_info "⚠️  Please edit backend/.env and add your real credentials!"
    log_info "   nano /opt/gemz/backend/.env"
fi

# Install backend dependencies
log_info "Installing backend dependencies..."
cd "$APP_DIR/backend"
npm install --prefer-offline --production
log_success "Backend dependencies installed"

# ─── Step 5: Build ─────────────────────────────────────────────────
log_step "5" "Building Project"

# Compile TypeScript
log_info "Compiling TypeScript..."
cd "$APP_DIR/backend"
npx tsc --skipLibCheck
log_success "TypeScript compiled"

# Install & build frontend
log_info "Installing frontend dependencies..."
cd "$APP_DIR/frontend"
npm install --prefer-offline

log_info "Building frontend..."
npm run build
log_success "Frontend built"

# ─── Step 6: Database ──────────────────────────────────────────────
log_step "6" "Setting Up Database"

log_info "Running database migrations..."
cd "$APP_DIR/backend"

# Run migrations if knex is available
if npx knex --version &> /dev/null; then
    npx knex migrate:latest || log_info "Migration skipped (knex not configured)"
else
    log_info "Running SQL schema files..."
    # Run schema files in order
    for sql_file in "$APP_DIR"/database/schema_v*.sql; do
        if [ -f "$sql_file" ]; then
            log_info "Running $(basename $sql_file)..."
            sudo -u postgres psql -d gemz_db -f "$sql_file" 2>/dev/null || true
        fi
    done
fi

log_success "Database updated"

# ─── Step 7: PM2 Configuration ─────────────────────────────────────
log_step "7" "Configuring PM2"

cd "$APP_DIR/backend"

# Stop old instance
log_info "Stopping old instance..."
pm2 delete "$PM2_APP_NAME" 2>/dev/null || true

# Start new instance
log_info "Starting Gem Z API..."
pm2 start dist/index.js --name "$PM2_APP_NAME" --env production \
    --max-memory-restart 512M \
    --restart-delay 3000

# Save PM2 config
pm2 save

# Setup PM2 startup (run once)
pm2 startup systemd -u root --hp /root 2>/dev/null || true

log_success "PM2 configured"

# ─── Step 8: Nginx Configuration ───────────────────────────────────
log_step "8" "Configuring Nginx"

if command -v nginx &> /dev/null; then
    log_info "Setting up Nginx..."
    
    # Create Nginx config
    cat > /etc/nginx/sites-available/gemz << 'EOF'
server {
    listen 80;
    server_name _;  # Accept any domain

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API Documentation
    location /api-docs {
        proxy_pass http://localhost:5000/api-docs;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # File uploads
    client_max_body_size 50M;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
EOF

    # Enable site
    ln -sf /etc/nginx/sites-available/gemz /etc/nginx/sites-enabled/gemz
    
    # Remove default site
    rm -f /etc/nginx/sites-enabled/default
    
    # Test config
    nginx -t
    
    # Restart Nginx
    systemctl restart nginx
    
    log_success "Nginx configured"
else
    log_info "Nginx not found. Install with: apt-get install nginx"
fi

# ─── Summary ───────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  🎉 Deployment Complete!                                         ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Your Gem Z platform is now live!${NC}"
echo ""
echo "📍 URLs:"
echo "   Frontend: http://$IP:3000"
echo "   Backend API: http://$IP:5000"
echo "   API Docs: http://$IP:5000/api-docs"
echo ""
echo "🔧 Management:"
echo "   PM2 Status: pm2 status"
echo "   View Logs: pm2 logs gemz-api"
echo "   Restart: pm2 restart gemz-api"
echo "   Stop: pm2 stop gemz-api"
echo ""
echo "📁 Directories:"
echo "   App: $APP_DIR"
echo "   Backup: $BACKUP_DIR"
echo "   Logs: pm2 logs"
echo ""
echo "⚠️  Next Steps:"
echo "   1. Edit .env: nano $APP_DIR/backend/.env"
echo "   2. Add your database credentials"
echo "   3. Add Pi Network API keys"
echo "   4. Add OpenAI API key"
echo "   5. Setup SSL: certbot --nginx"
echo ""
echo "📞 Support:"
echo "   Check logs: pm2 logs gemz-api --lines 100"
echo "   Monitor: pm2 monit"
echo ""

# Show server IP
IP=$(ip route get 1 | awk '{print $(NF-2);exit}')
echo -e "🌐 Server IP: ${CYAN}$IP${NC}"
echo ""
