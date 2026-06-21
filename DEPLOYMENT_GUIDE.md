# 🌐 Free Production Deployment Guide — Detective Corkboard Studio

This guide outlines the steps required to deploy the **Detective Corkboard Studio** application for **100% free** using **Neon.tech** (PostgreSQL database), **Render** (FastAPI backend), and **Vercel** (static frontend), linked to your **GoDaddy** domain.

---

## 1. 🐘 Setup a Free Database on Neon.tech

[Neon](https://neon.tech/) offers a serverless PostgreSQL database with a generous, persistent free tier.

1. **Sign up** at [Neon.tech](https://neon.tech/).
2. Create a new project called `detective-corkboard-db`.
3. In your Neon dashboard under **Connection Details**, copy your PostgreSQL connection string. It will look like this:
   ```text
   postgresql://corkboard_owner:abcdefg12345@ep-cool-darkness-a5xyz123.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Save this string; you will need to paste it as the `DATABASE_URL` in Render.

---

## 2. 🚀 Deploy Backend API to Render (Free Tier)

[Render](https://render.com/) allows you to host Docker services directly from your GitHub repository for free.

1. **Sign up** at [Render.com](https://render.com/) and connect your GitHub account.
2. Click **New +** ➔ **Web Service**.
3. Select your repository `detective-corkboard-studio`.
4. Configure the Web Service settings:
   - **Name**: `detective-corkboard-api`
   - **Environment**: `Docker`
   - **Docker Path**: `Dockerfile` *(Leave as default root Dockerfile)*
   - **Build Context**: `.` *(Leave as default repository root)*
   - **Instance Type**: `Free`
5. Click **Advanced** and add the following **Environment Variables**:
   - `DATABASE_URL` = *(Paste your Neon.tech connection string from Step 1)*
   - `ENVIRONMENT` = `production`
   - `SECRET_KEY` = *(Type a long, secure random key for JWT token signatures)*
   - `ALLOWED_ORIGINS` = `https://detectivecorkboard.com,https://www.detectivecorkboard.com`
6. Click **Create Web Service**.
7. Once deployed, Render will provide a free URL, such as `https://detective-corkboard-api.onrender.com`.

---

## 3. 📦 Deploy Static Frontend to Vercel (Free Tier)

[Vercel](https://vercel.com/) is a high-performance cloud hosting provider for static frontend apps, with instant Git-integrated deployments.

1. **Sign up** at [Vercel.com](https://vercel.com/) using your GitHub account.
2. Click **Add New** ➔ **Project**.
3. Import your `detective-corkboard-studio` repository.
4. Configure the project settings:
   - **Framework Preset**: `Other` or `None`
   - **Root Directory**: `frontend` *(Click Edit and select the frontend subfolder so Vercel only hosts the static files)*
5. Click **Deploy**.
6. Once completed, Vercel will deploy your site and provide a free URL, such as `https://detective-corkboard-studio.vercel.app`.

---

## 4. ⚙️ GoDaddy DNS Configuration

To point your custom domain `detectivecorkboard.com` to your deployed services:

1. **Log in** to your [GoDaddy Domain Portfolio](https://dcc.godaddy.com/domains).
2. Click **Manage DNS** next to `detectivecorkboard.com`.
3. Configure the following records:

### A. Point `detectivecorkboard.com` to Vercel (Frontend)
Go to your **Vercel Project Dashboard** ➔ **Settings** ➔ **Domains**.
- Add `detectivecorkboard.com` and `www.detectivecorkboard.com`.
- Vercel will display the required DNS records:
  - Add an **`A`** record in GoDaddy:
    - **Host**: `@`
    - **Points to**: `76.76.21.21` *(Vercel IP)*
  - Add a **`CNAME`** record in GoDaddy (if not already present):
    - **Host**: `www`
    - **Points to**: `cname.vercel-dns.com`

### B. Point `api.detectivecorkboard.com` to Render (Backend)
Go to your **Render Web Service Dashboard** ➔ **Settings** ➔ **Custom Domains**.
- Add `api.detectivecorkboard.com`.
- Render will display the required DNS record:
  - Add a **`CNAME`** record in GoDaddy:
    - **Host**: `api`
    - **Points to**: `detective-corkboard-api.onrender.com` *(Your Render URL)*

---

## 5. 🧪 Verification

1. Once the DNS records propagate, navigate to `https://detectivecorkboard.com`.
2. Register an account, log in, create a board, and add tiles.
3. Everything is now hosted completely for free with automatic SSL certificates and automated CD deployments on push/merge to your GitHub `main` branch!
