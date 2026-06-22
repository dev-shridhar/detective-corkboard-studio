# 🕵️ Detective Corkboard

> **Pin your ideas like a detective.**  
> An infinite corkboard canvas with retro detective vibes. Drag tiles, hang yarn, connect your thoughts. Use it for plans, designs, flowcharts, mind maps, or just pinning up whatever's in your head.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-green.svg)](https://fastapi.tiangolo.com/)

---

## ✨ What It Is

A web-based visual board builder wrapped in a noir detective theme. Pin sticky notes, polaroids, newspaper clippings, and tape labels onto an infinite canvas. Connect them with realistic hanging yarn. Move things around. Make a mess. Find the pattern.

**The theme is detective — the use is whatever you want.**

- 📌 **Drag tiles** onto an infinite canvas with smooth pan and zoom
- 🧵 **Connect them with yarn** — physics-driven catenary curves in multiple colors
- 🗂️ **Four tile types** — note cards, tape labels, polaroids, newspaper clippings
- 🎨 **Color your tiles** and match your yarn to your mood
- 📝 **Attach rich details** — descriptions, concept tags, resource links
- ↩️ **Undo / redo** everything (Ctrl+Z / Ctrl+Y)
- 🔍 **Search** across all tiles to find what you need
- 🔐 **Secure user authentication** with JWT tokens
- 🌙 **Dark mode** included

---

## 🗂 Repo Structure

```
detective-corkboard-studio/
│
├── backend/                    # Python FastAPI server
│   ├── app/
│   │   ├── api/                # Route controllers (thin HTTP layer)
│   │   │   ├── v1/
│   │   │   │   ├── auth.py
│   │   │   │   ├── boards.py
│   │   │   │   ├── nodes.py
│   │   │   │   └── edges.py
│   │   ├── core/               # App-wide config, security, settings
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── database.py
│   │   ├── models/             # SQLModel ORM table definitions
│   │   │   ├── user.py
│   │   │   ├── board.py
│   │   │   ├── node.py
│   │   │   └── edge.py
│   │   ├── repositories/       # Data access layer (class-based DB CRUD)
│   │   │   ├── base.py
│   │   │   ├── user_repository.py
│   │   │   ├── board_repository.py
│   │   │   ├── node_repository.py
│   │   │   └── edge_repository.py
│   │   ├── services/           # Business logic layer (class-based)
│   │   │   ├── auth_service.py
│   │   │   ├── board_service.py
│   │   │   ├── node_service.py
│   │   │   └── edge_service.py
│   │   ├── schemas/            # Pydantic request/response models
│   │   │   ├── user.py
│   │   │   ├── board.py
│   │   │   ├── node.py
│   │   │   └── edge.py
│   │   └── main.py             # FastAPI app entry point
│   ├── tests/                  # Pytest test suite
│   ├── alembic/                # DB migrations
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/                   # Vanilla JS + CSS web client
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── canvas.js           # Infinite canvas engine (pan/zoom/lerp)
│   │   ├── nodes.js            # Tile rendering and drag-drop logic
│   │   ├── edges.js            # Yarn string physics (catenary/bezier)
│   │   ├── ui.js               # Detail panel, search, sidebar
│   │   ├── auth.js             # Login/register client logic
│   │   ├── api.js              # HTTP client for backend API
│   │   └── history.js          # Undo/redo command stack
│   ├── robots.txt
│   ├── sitemap.xml
│   └── index.html
│
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI pipeline
├── docker-compose.yml
├── .gitignore
├── DEVELOPMENT_PLAN.md
└── DEPLOYMENT_GUIDE.md
```

---

## 🚀 Getting Started

Coming soon.

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.
