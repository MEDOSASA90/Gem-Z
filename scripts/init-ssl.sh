#!/bin/bash
# =============================================================================
# GEM Z — SSL Certificate Initialization Script
# Creates self-signed certificates for initial setup or Let's Encrypt
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SSL_DIR="$PROJECT_DIR/nginx/ssl"
DOMAIN=${DOMAIN:-localhost}
EMAIL=${EMAIL:-admin@gemz.app}

mkdir -p "$SSL_DIR"

echo "═══════════════════════════════════════════════════════════════"
echo "  GEM Z — SSL Certificate Initialization"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Domain: $DOMAIN"
echo "Email:  $EMAIL"
echo ""

# Check if certbot certificates exist
if [ -d "$PROJECT_DIR/certbot_data/live/$DOMAIN" ]; then
    echo "✓ Existing Let's Encrypt certificates found for $DOMAIN"
    exit 0
fi

# Option 1: Let's Encrypt (production)
if [ "$1" == "--letsencrypt" ]; then
    echo "[SSL] Requesting Let's Encrypt certificate for $DOMAIN..."
    
    docker run -it --rm \
        -v "$PROJECT_DIR/certbot_data:/etc/letsencrypt" \
        -v "$PROJECT_DIR/certbot_www:/var/www/certbot" \
        -p 80:80 \
        certbot/certbot:v3.1.0 certonly \
        --standalone \
        --agree-tos \
        --no-eff-email \
        --email "$EMAIL" \
        -d "$DOMAIN" \
        ${EXTRA_DOMAINS}
    
    echo "✓ Let's Encrypt certificate obtained successfully!"
    echo "  Certificates: $PROJECT_DIR/certbot_data/live/$DOMAIN/"
    exit 0
fi

# Option 2: Self-signed certificate (development / initial setup)
echo "[SSL] Generating self-signed certificate for initial setup..."
echo ""
echo "  To use Let's Encrypt instead, run:"
echo "    ./scripts/init-ssl.sh --letsencrypt"
echo ""

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$SSL_DIR/selfsigned.key" \
    -out "$SSL_DIR/selfsigned.crt" \
    -subj "/C=US/ST=State/L=City/O=GEM Z/CN=$DOMAIN" \
    -addext "subjectAltName=DNS:$DOMAIN,DNS:*.$DOMAIN,IP:127.0.0.1,IP:0.0.0.0"

echo ""
echo "✓ Self-signed certificate generated:"
echo "  Certificate: $SSL_DIR/selfsigned.crt"
echo "  Key:         $SSL_DIR/selfsigned.key"
echo ""
echo "⚠ For production, obtain a real certificate with:"
echo "  ./scripts/init-ssl.sh --letsencrypt"
