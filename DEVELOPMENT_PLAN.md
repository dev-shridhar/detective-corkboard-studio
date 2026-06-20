# 🗺️ Detailed Development Plan — Detective Corkboard Studio

## 1. Project Vision

Detective Corkboard Studio is a **premium, real-time collaborative** investigation board builder. It gives any user the power to create, customize, and share beautiful corkboard-style visual knowledge maps — like Figma, but with the aesthetic of a vintage detective's case board.

The app targets:
- Students building visual study maps
- Researchers organizing concept graphs
- Teams doing visual project planning
- Individuals building personal knowledge bases

---

## 2. Engineering Guidelines

### Git Workflow
- `main` branch is **protected** — no direct pushes
- All development happens on **feature branches** following the naming pattern:
  - `feature/<short-description>` (e.g. `feature/user-auth`, `feature/canvas-drag`)
  - `fix/<short-description>` for bug fixes
  - `chore/<short-description>` for tooling/config changes
- All feature branches must be **merged via Pull Request** reviewed before merging
- Squash merges are preferred to keep the main branch history clean

### Commit Message Format
```
[scope]: Short title in present tense (max 50 chars)

Summary:
- Bullet point of what changed and why

Description:
- Deeper technical rationale if needed
- Architecture decisions
- Trade-offs considered
```

**Scopes**: `auth`, `board`, `node`, `edge`, `canvas`, `ui`, `api`, `db`, `config`, `ci`, `docs`

### Code Architecture (Backend)
- **Layered Class-Based Architecture** — not function-only scripts
- Four distinct layers: Controllers → Services → Repositories → Database
- Each layer has a single responsibility and communicates only with the adjacent layer
- All database operations go through `Repository` classes only
- Business logic lives exclusively in `Service` classes
- HTTP routing and serialization lives exclusively in `Controller` (FastAPI Router) classes

### Code Architecture (Frontend)
- **Module-based Vanilla JS** — one file per domain concern
- No framework (React/Vue) to keep zero build-step deployment
- The canvas engine is completely decoupled from the UI panel and API modules

---

## 3. System Architecture

### High-Level Architecture
```
Browser Client (Vanilla JS)
    │
    │  HTTPS REST API (JSON)
    ▼
FastAPI Backend (Python 3.11+)
    ├── Auth Controller ──► AuthService ──► UserRepository ──► PostgreSQL
    ├── Board Controller ─► BoardService ─► BoardRepository ─► PostgreSQL
    ├── Node Controller ──► NodeService ──► NodeRepository ──► PostgreSQL
    └── Edge Controller ──► EdgeService ──► EdgeRepository ──► PostgreSQL
```

### Database Schema (Conceptual)
```
Users
  ├── id (UUID, PK)
  ├── username (unique)
  ├── email (unique)
  ├── hashed_password
  ├── created_at
  └── boards → [Board]

Boards
  ├── id (UUID, PK)
  ├── owner_id (FK → Users)
  ├── name
  ├── description
  ├── is_public (bool)
  ├── created_at
  ├── updated_at
  ├── nodes → [Node]
  └── edges → [Edge]

Nodes
  ├── id (UUID, PK)
  ├── board_id (FK → Boards)
  ├── title
  ├── description (text)
  ├── shape (enum: note_card | tape_label | polaroid | newspaper_clipping)
  ├── x (float)
  ├── y (float)
  ├── color (hex string)
  ├── concepts (JSON array of strings)
  ├── links (JSON array of {title, url})
  └── created_at

Edges (Yarn Strings)
  ├── id (UUID, PK)
  ├── board_id (FK → Boards)
  ├── source_node_id (FK → Nodes)
  ├── target_node_id (FK → Nodes)
  ├── color (hex string — thread color)
  ├── label (optional string on the string)
  └── created_at
```

---

## 4. Authentication Design

### Strategy
- **JWT Bearer Token** authentication (stateless, no sessions)
- Passwords hashed with `bcrypt` via `passlib`
- Access tokens expire in **30 minutes**, refresh tokens in **7 days**
- Refresh token rotation — each refresh invalidates the old token
- All board/node/edge endpoints require a valid Bearer token

### Flow
```
User fills login form
    ↓
POST /api/v1/auth/login { username, password }
    ↓
AuthService.authenticate_user() verifies bcrypt hash
    ↓
Returns { access_token, refresh_token }
    ↓
Frontend stores tokens in memory (access) + HttpOnly cookie (refresh)
    ↓
Each subsequent request includes Authorization: Bearer <access_token>
```

### Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Create new user account |
| POST | `/api/v1/auth/login` | Authenticate and receive JWT tokens |
| POST | `/api/v1/auth/refresh` | Rotate refresh token, get new access token |
| POST | `/api/v1/auth/logout` | Invalidate current refresh token |
| GET  | `/api/v1/auth/me` | Get current authenticated user profile |

---

## 5. API Endpoints Design

### Boards
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/v1/boards` | List all boards owned by current user |
| POST   | `/api/v1/boards` | Create a new blank board |
| GET    | `/api/v1/boards/{id}` | Get full board state (nodes + edges) |
| PATCH  | `/api/v1/boards/{id}` | Update board name / description |
| DELETE | `/api/v1/boards/{id}` | Delete a board (owner only) |

### Nodes (Tiles)
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/v1/boards/{id}/nodes` | List all nodes on a board |
| POST   | `/api/v1/boards/{id}/nodes` | Create a new node |
| PATCH  | `/api/v1/boards/{id}/nodes/{node_id}` | Update node (position, content, shape) |
| DELETE | `/api/v1/boards/{id}/nodes/{node_id}` | Delete a node |

### Edges (Yarn Strings)
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/v1/boards/{id}/edges` | List all edges on a board |
| POST   | `/api/v1/boards/{id}/edges` | Create a new edge (connect two nodes) |
| PATCH  | `/api/v1/boards/{id}/edges/{edge_id}` | Update edge color or label |
| DELETE | `/api/v1/boards/{id}/edges/{edge_id}` | Delete an edge |

---

## 6. Frontend Module Design

### Canvas Engine (`canvas.js`)
- Infinite canvas backed by an HTML5 `<canvas>` element
- Pan: Mouse drag on empty canvas area translates the world transform
- Zoom: Mouse wheel scales from the cursor point (scale origin preserving)
- Lerp camera: Smooth animated transition to a target node on selection
- Viewport conversion helpers: `screenToWorld(x, y)` and `worldToScreen(x, y)`

### Node / Tile System (`nodes.js`)
- Four tile shapes rendered via canvas 2D context: `note_card`, `tape_label`, `polaroid`, `newspaper_clipping`
- Hit detection: Each frame checks if a `mousedown` event falls within a node's bounding box
- Drag: On mousedown hit, enters drag mode — subsequent `mousemove` updates world coordinates in real time
- Drop: On `mouseup`, emits a `PATCH /nodes/{id}` API call to persist the new position

### Yarn String System (`edges.js`)
- Strings rendered as **Quadratic Bézier Curves** with a downward-pulled gravity control point — simulating a hanging catenary
- **Adding a string**: Click-hold the pushpin area of any tile → drag out a live preview string → release on target tile's pushpin to snap the connection
- Multiple thread colors selectable from a vintage spool palette
- Labels can be placed along the midpoint of the string

### History (Undo/Redo) (`history.js`)
- Command pattern: Every user action (move, add, delete, connect) is recorded as a command object `{ do(), undo() }`
- A bounded stack (max 100 commands) stores history
- `Ctrl+Z` calls `stack.pop().undo()` and pushes to the redo stack
- `Ctrl+Y` / `Ctrl+Shift+Z` calls `redoStack.pop().do()`

### Detail Panel (`ui.js`)
- Clicking a tile opens a sliding vintage newspaper panel
- Panel has an **Edit mode** toggled via a typewriter-styled Edit button
- Edit mode shows styled inputs for: title, description, shape selector, color picker, concept list, and link array
- Saving triggers a `PATCH /nodes/{id}` call and closes the edit mode

### Auth Module (`auth.js`)
- Handles login/register form submission and token lifecycle
- Stores access token in `memory` (not localStorage — more secure against XSS)
- Stores refresh token in `HttpOnly` cookie managed by the backend
- Automatically refreshes the access token 60 seconds before expiry

---

## 7. Development Phases & Milestones

### Phase 1 — Project Foundation
- [x] Create GitHub repository
- [x] Write detailed development plan (`DEVELOPMENT_PLAN.md`)
- [ ] Initialize backend Python project (FastAPI + SQLModel + Alembic)
- [ ] Initialize frontend folder structure (HTML, CSS, JS modules)
- [ ] Set up Docker Compose for local dev (FastAPI + PostgreSQL)
- [ ] Set up GitHub Actions CI pipeline (lint + tests)

### Phase 2 — User Authentication
- [ ] Implement `UserRepository`, `UserService` classes
- [ ] Build JWT auth flow: register, login, refresh, logout
- [ ] Build and style the login / register page (vintage typewriter aesthetic)
- [ ] Protect all board/node/edge endpoints behind auth middleware
- [ ] Write auth unit tests

### Phase 3 — Board Management
- [ ] Implement `BoardRepository`, `BoardService` classes
- [ ] Build CRUD API endpoints for boards
- [ ] Build the board home dashboard (list of boards, create new board button)
- [ ] Write board service unit tests

### Phase 4 — Infinite Canvas & Tile Drag
- [ ] Implement infinite canvas engine (`canvas.js`) — pan, zoom, lerp
- [ ] Implement tile rendering for all four shapes
- [ ] Implement drag-and-drop tile repositioning
- [ ] Wire drag events to `PATCH /nodes` API calls
- [ ] Implement `NodeRepository`, `NodeService` classes

### Phase 5 — Yarn String System
- [ ] Implement Bézier catenary string rendering
- [ ] Implement interactive string attach flow (pin-drag-snap)
- [ ] Implement thread color picker
- [ ] Implement `EdgeRepository`, `EdgeService` classes
- [ ] Wire to `POST/DELETE /edges` API calls

### Phase 6 — Tile Detail Panel & Search
- [ ] Build editable sliding detail panel
- [ ] Implement concept list editing
- [ ] Implement resource links editing
- [ ] Build search/filter bar with tile highlight/fade logic

### Phase 7 — Undo/Redo & History
- [ ] Implement command pattern history stack
- [ ] Wire all board mutations (add/move/delete/connect) to command objects
- [ ] Keyboard shortcut bindings (Ctrl+Z, Ctrl+Y)

### Phase 8 — Deployment
- [ ] Write production Dockerfile for backend
- [ ] Configure environment variables and secrets
- [ ] Deploy backend to subdomain via server or platform of choice
- [ ] Deploy frontend (static files served by FastAPI or CDN)

---

## 8. Technology Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Backend Framework | **FastAPI** (Python 3.11+) | Async, fast, auto-docs, type-safe |
| ORM | **SQLModel** | Pydantic + SQLAlchemy unified |
| Database | **PostgreSQL** | Production-grade relational DB |
| Migrations | **Alembic** | Schema versioning |
| Auth | **python-jose** + **passlib** | JWT + bcrypt |
| Frontend | **Vanilla JS** + **HTML5 Canvas** | Zero-build, minimal dependencies |
| Styling | **Vanilla CSS** | Maximum control over premium aesthetics |
| Containerization | **Docker** + **Docker Compose** | Reproducible local and prod environments |
| CI/CD | **GitHub Actions** | Lint + test on every PR |
| Testing | **Pytest** | Python backend unit and integration tests |

---

## 9. Open Design Decisions (To Be Resolved)

| Decision | Options | Leaning |
|----------|---------|---------|
| Real-time multi-user sync | WebSockets vs. Polling | WebSockets (Socket.IO or FastAPI native) |
| Frontend framework | Vanilla JS vs. React | Vanilla JS (simpler, zero build step) |
| Hosting | Self-hosted VPS vs. Fly.io vs. Railway | TBD based on existing subdomain setup |
| Board sharing | Public link sharing vs. invite-only | Both: public read + invite for edit |
| Offline support | PWA / Service Worker | Stretch goal for later phase |
