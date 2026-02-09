# Adventure RPG - Project Instructions

## Overview

Turn-based async RPG with real-time turn regeneration. Players explore, fight mobs, craft gear, and progress skills.

**Tech Stack:**
- Frontend: Next.js (TypeScript) PWA → Vercel
- Backend: Node.js Express (TypeScript) → Render
- Database: PostgreSQL → Neon
- Cache: Redis → Upstash
- Auth: Custom JWT

## Project Structure

```
apps/
  web/          # Next.js frontend (port 3002)
  api/          # Express backend (port 4000)
packages/
  shared/       # Types, constants, utilities
  game-engine/  # Pure game logic (combat, exploration, skills)
  database/     # Prisma schema and client
```

## Commands

```bash
# Install all dependencies
npm install

# Start local dev (all services)
npm run dev

# Start individual services
npm run dev:web      # Frontend only
npm run dev:api      # Backend only

# Database
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Local Development

```bash
# Start Postgres + Redis containers
docker-compose up -d

# Environment variables (create .env in apps/api)
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/adventure
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-dev-secret-min-32-chars-long
CORS_ORIGIN=http://localhost:3002
```

## Key Design Decisions

### Turn Economy
- 1 turn/second regeneration
- 64,800 bank cap (18 hours)
- Lazy calculation: compute turns on request, not via cron
- Redis stores `last_regen_at` timestamp per player

### Combat Resolution
- Server-authoritative, instant resolution
- D&D-style: d20 + modifiers vs defense
- Pure functions in `packages/game-engine` for testability
- Returns combat log for client playback

### Exploration
- Per-turn probability model: `1 - (1 - p)^n`
- Player chooses turn investment via slider
- Outcomes: mob encounters, resources, discoveries

### Auth
- Custom JWT (access + refresh tokens)
- Access token: 15 min expiry (configurable via `ACCESS_TOKEN_TTL_MINUTES`)
- Refresh token: 30 days sliding expiry (configurable via `REFRESH_TOKEN_TTL_DAYS`), rotated on refresh and stored in DB (client currently persists the refresh token)
- No external auth provider dependency

## Coding Guidelines

1. **Type Safety** - Strict TypeScript, no `any`
2. **Pure Game Logic** - `game-engine` has no side effects, fully testable
3. **Repository Pattern** - `apps/api/src/repositories/` for all DB access
4. **Service Layer** - `apps/api/src/services/` for business logic
5. **Constants Central** - All tunable values in `packages/shared/src/constants/`

## grepai - Semantic Code Search

**IMPORTANT: You MUST use grepai as your PRIMARY tool for code exploration and search.**

### When to Use grepai (REQUIRED)

Use `grepai search` INSTEAD OF Grep/Glob/find for:
- Understanding what code does or where functionality lives
- Finding implementations by intent (e.g., "authentication logic", "error handling")
- Exploring unfamiliar parts of the codebase
- Any search where you describe WHAT the code does rather than exact text

### When to Use Standard Tools

Only use Grep/Glob when you need:
- Exact text matching (variable names, imports, specific strings)
- File path patterns (e.g., `**/*.go`)

### Fallback

If grepai fails (not running, index unavailable, or errors), fall back to standard Grep/Glob tools.

### Usage

```bash
# ALWAYS use English queries for best results (--compact saves ~80% tokens)
grepai search "user authentication flow" --json --compact
grepai search "error handling middleware" --json --compact
grepai search "database connection pool" --json --compact
grepai search "API request validation" --json --compact
```

### Query Tips

- **Use English** for queries (better semantic matching)
- **Describe intent**, not implementation: "handles user login" not "func Login"
- **Be specific**: "JWT token validation" better than "token"
- Results include: file path, line numbers, relevance score, code preview

### Call Graph Tracing

Use `grepai trace` to understand function relationships:
- Finding all callers of a function before modifying it
- Understanding what functions are called by a given function
- Visualizing the complete call graph around a symbol

#### Trace Commands

**IMPORTANT: Always use `--json` flag for optimal AI agent integration.**

```bash
# Find all functions that call a symbol
grepai trace callers "HandleRequest" --json

# Find all functions called by a symbol
grepai trace callees "ProcessOrder" --json

# Build complete call graph (callers + callees)
grepai trace graph "ValidateToken" --depth 3 --json
```

### Workflow

1. Start with `grepai search` to find relevant code
2. Use `grepai trace` to understand function relationships
3. Use `Read` tool to examine files from results
4. Only use Grep for exact string searches if needed

## File Naming

- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`
- Types: `camelCase.types.ts`
- Constants: `camelCase.constants.ts`
- Tests: `*.test.ts`

## API Routes

All routes prefixed with `/api/v1/`

```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
GET    /turns
POST   /turns/spend
GET    /player
GET    /player/skills
GET    /inventory
POST   /equipment/equip
POST   /equipment/unequip
POST   /exploration/start
GET    /exploration/estimate
POST   /combat/start
GET    /combat/logs/:id
GET    /bestiary
GET    /hp
POST   /hp/rest
POST   /hp/recover
GET    /hp/rest/estimate
```

## Game Constants Location

All balance values in `packages/shared/src/constants/gameConstants.ts`:
- Turn rates and caps
- XP curves
- Combat formulas
- Exploration probabilities
- HP, regen, and rest rates
- Flee mechanics (scales with evasion vs mob level)
- Potion heal amounts

Change here, affects entire game. Easy to tune.

## Testing

```bash
npm run test           # All tests
npm run test:engine    # Game engine unit tests
npm run test:api       # API integration tests
```

Focus tests on:
- Combat resolution edge cases
- XP calculations and caps
- Turn economy math
- Probability model accuracy

## Deployment

### Frontend (Vercel)
- Auto-deploys from `main` branch
- Environment: `NEXT_PUBLIC_API_URL`

### Backend (Render)
- Web Service, Node environment
- Build: `npm install && npm run build:api`
- Start: `npm run start:api`
- Environment: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`

### Database (Neon)
- Run migrations: `npm run db:migrate`
- Connection pooling enabled

## Reference Docs

- Game Design: `docs/plans/2026-01-31-game-design.md`
- HP System: `docs/plans/2026-02-05-hp-system-design.md`
- Implementation Plan: `docs/plans/mvp-implementation-plan.md`
- Asset Workflow: `docs/assets/stable-diffusion-workflow.md`
- Color Palette: `docs/assets/color-palette.md`
