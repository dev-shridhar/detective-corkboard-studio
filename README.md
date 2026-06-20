# 🕵️ Detective Corkboard Studio

> A premium, real-time collaborative investigation board builder — think **Figma meets a classic detective corkboard**. Users can drag tiles, hang yarn strings between them, attach details and links, and share multi-user boards in real time.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-green.svg)](https://fastapi.tiangolo.com/)

---

## ✨ Overview

Detective Corkboard Studio is a web-based, multi-user creative workspace where you can:

- 🪄 **Create blank boards** with an infinite canvas (Figma-style pan and zoom)
- 📌 **Drag and drop tiles** (newspaper clippings, note cards, polaroid photos, tape labels) anywhere on the board
- 🧵 **Connect tiles with realistic hanging yarn strings** — complete with catenary curve physics, multiple thread colors, and interactive attach-and-detach
- 📝 **Attach rich details** to each tile — descriptions, concept lists, external resource links, and metadata
- ↩️ **Full undo / redo history** (Ctrl+Z / Ctrl+Y) for all board interactions
- 🔍 **Global search bar** to highlight and filter visible tiles across the board
- 👥 **Multi-user collaboration** — multiple users can view and edit the same board simultaneously
- 🔐 **Secure user authentication** — JWT-based token system with registration and login

---

## 🗂 Repository Structure

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
│   └── index.html
│
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI pipeline
├── docker-compose.yml
├── .gitignore
└── DEVELOPMENT_PLAN.md
```

---

## 🚀 Quick Start (Coming Soon)

Setup instructions will be added when the first working build is ready.

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.
