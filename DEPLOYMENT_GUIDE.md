# 🌐 Production Deployment Guide — Detective Corkboard Studio

This guide outlines the steps required to deploy the **Detective Corkboard Studio** application to your production server under the domain **`detectivecorkboard.com`**.

---

## 1. ⚙️ DNS Configuration

Go to your domain registrar (e.g., Namecheap, GoDaddy, Cloudflare) and configure the following **A Records**:

| Type | Host | Value | TTL | Description |
|------|------|-------|-----|-------------|
| **A** | `@` | `YOUR_SERVER_PUBLIC_IP` | Automatic / 1 hour | Maps domain to server IP |
| **A** | `www` | `YOUR_SERVER_PUBLIC_IP` | Automatic / 1 hour | Maps sub-domain to server IP |
| **A** | `api` | `YOUR_SERVER_PUBLIC_IP` | Automatic / 1 hour | Backend API sub-domain |

---

## 2. 🖥️ VPS Server Setup (Ubuntu 22.04 LTS Recommended)

Connect to your server via SSH:
```bash
ssh root@YOUR_SERVER_PUBLIC_IP
```

Update system packages:
```bash
sudo apt update && sudo apt upgrade -y
```

### Install Docker & Docker Compose
```bash
# Install Docker
sudo apt install apt-transport-https ca-certificates curl software-properties-common -y
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/whitelist.d/docker.list > /dev/whitelist
sudo apt update
sudo apt install docker-ce -y

# Verify Docker status
sudo systemctl status docker

# Install Docker Compose v2
sudo apt install docker-compose-plugin -y
```

### Install Git & Certbot
```bash
sudo apt install git certbot -y
```

---

## 3. 🔒 Provision Let's Encrypt SSL Certificates

Run Certbot to request certificates for the domain.
*(Note: Port 80 must be open and temporarily free of any active web service so Certbot can run its verification server).*

```bash
sudo certbot certonly --standalone -d detectivecorkboard.com -d www.detectivecorkboard.com -d api.detectivecorkboard.com
```

Upon successful completion, the certificate files will be generated in:
- Certificate: `/etc/letsencrypt/live/detectivecorkboard.com/fullchain.pem`
- Private Key: `/etc/letsencrypt/live/detectivecorkboard.com/privkey.pem`

Configure automatic renewal (Certbot sets up a systemd cron timer automatically, check with):
```bash
sudo certbot renew --dry-run
```

---

## 4. 📁 Project Setup on Server

Clone the repository to the `/app` folder (or your chosen directory) on the server:
```bash
git clone https://github.com/YOUR_GITHUB_ORGANIZATION/detective-corkboard-studio.git /app/detective-corkboard-studio
cd /app/detective-corkboard-studio
```

---

## 5. 🛠️ Configure Environment Variables

Create the production environment file for the backend:
```bash
nano backend/.env.production
```

Add the following production configuration:
```env
# Application Settings
APP_NAME="Detective Corkboard Studio"
APP_VERSION="0.1.0"
ENVIRONMENT="production"

# Relational Database URL (Points to the 'db' postgres container name)
DATABASE_URL="postgresql://corkboard:CHOOSE_A_SECURE_PASSWORD@db:5432/corkboard_db"

# JWT Authentication Secrets
SECRET_KEY="CHOOSE_A_VERY_LONG_SECURE_RANDOM_SECRET_KEY_HERE"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS allowed frontend origins
ALLOWED_ORIGINS="https://detectivecorkboard.com,https://www.detectivecorkboard.com"
```

Configure `docker-compose.prod.yml`'s postgres secret to match `DATABASE_URL`:
- Edit `docker-compose.prod.yml`
- Locate `POSTGRES_PASSWORD` under the `db` service and set it to: `CHOOSE_A_SECURE_PASSWORD`.

---

## 6. 🚀 Launch the Application Stack

Start the Docker services using the production Compose configuration:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

This starts:
1. `corkboard_db_prod` (PostgreSQL Database)
2. `corkboard_api_prod` (FastAPI REST Backend)
3. `corkboard_frontend_prod` (Nginx serving frontend static files + routing `/api/v1` API traffic with SSL enabled)

Check the container logs:
```bash
docker compose -f docker-compose.prod.yml logs -f
```

### Run Database Migrations
FastAPI initializes database schemas automatically on startup via SQLModel code inside the app lifecycle, but if you need to run them manually:
```bash
docker compose -f docker-compose.prod.yml exec api alembic upgrade head
```

---

## 7. 🧪 Post-Deployment Verification

1. Load your website: `https://detectivecorkboard.com`.
2. Check that the secure lock icon (SSL) appears in the browser URL bar.
3. Test authentication: register a user account, log in, create a board, and spawn visual evidence cards.
4. Open the browser's developer console to verify that requests route smoothly to `https://api.detectivecorkboard.com/api/v1`.
