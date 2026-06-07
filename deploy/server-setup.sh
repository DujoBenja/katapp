#!/usr/bin/env bash
#
# Jednokratno postavljanje SVJEŽEG Ubuntu 24.04 servera za posluživanje kataloga.
# Pokreni OVO NA SERVERU kao root (nakon reinstalacije OS-a):
#
#   ssh root@TVOJ_IP
#   bash <(curl -s ...)   # ili jednostavno kopiraj cijeli sadržaj i zalijepi u SSH
#
# Postavlja: ažuriranja, nginx, firewall (ufw), nginx konfiguraciju za katalog.
# HTTPS (certbot) i prijenos datoteka rade se NAKON ovoga (vidi README / poruke).

set -euo pipefail

DOMAIN="pivskatvrdja.hr"
WEBROOT="/var/www/katapp"

echo "==> Ažuriranje sustava"
export DEBIAN_FRONTEND=noninteractive
apt update && apt -y upgrade

echo "==> Instalacija nginx, certbot, ufw, rsync"
apt install -y nginx certbot python3-certbot-nginx ufw rsync

echo "==> Firewall (dopusti SSH + HTTP/HTTPS)"
ufw allow OpenSSH || true
ufw allow 'Nginx Full' || true
ufw --force enable

echo "==> Web direktorij: $WEBROOT"
mkdir -p "$WEBROOT"
# privremena početna stranica dok ne prebaciš build
echo "<h1>Katalog uskoro...</h1>" > "$WEBROOT/index.html"

echo "==> nginx konfiguracija"
cat > /etc/nginx/sites-available/katapp <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    root ${WEBROOT};
    index index.html;

    gzip on;
    gzip_types text/css application/javascript image/svg+xml;
    gzip_min_length 1024;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    location = /index.html {
        add_header Cache-Control "no-cache";
    }

    # SPA fallback: sve rute serviraju index.html (/admin, /login rade na refresh)
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

ln -sf /etc/nginx/sites-available/katapp /etc/nginx/sites-enabled/katapp
rm -f /etc/nginx/sites-enabled/default

echo "==> Test i ponovno učitavanje nginxa"
nginx -t
systemctl reload nginx
systemctl enable nginx

echo ""
echo "============================================================"
echo " Server je spreman. Sljedeći koraci:"
echo " 1) S TVOG Maca prebaci build:   ./deploy.sh"
echo " 2) Kad DNS pokazuje na server, uključi HTTPS na serveru:"
echo "    certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} \\"
echo "      --redirect -m <tvoja-email> --agree-tos -n"
echo "============================================================"
