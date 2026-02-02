# Adventure RPG

Turn-based async RPG with real-time turn regeneration. Explore, fight mobs, craft gear, and progress skills.

## Tech Stack

| Component | Technology | Hosting |
|-----------|------------|---------|
| Frontend | Next.js 16 (TypeScript) PWA | Vercel |
| Backend | Node.js Express (TypeScript) | Render |
| Database | PostgreSQL | Neon |
| Cache | Redis | Upstash |
| Auth | Custom JWT | - |

## Quick Start

### Prerequisites
- Node.js 20+
- Docker (for local Postgres + Redis)

### Setup

```bash
# Clone and install
git clone <repo>
cd Adventure
npm install

# Start local databases
docker-compose up -d

# Run database migrations
npm run db:migrate

# Build packages and start dev servers
npm run dev
```

### URLs
- Frontend: http://localhost:3002
- API: http://localhost:4000
- API Health: http://localhost:4000/health

## Project Structure

```
Adventure/
├── apps/
│   ├── web/              # Next.js frontend
│   └── api/              # Express backend
├── packages/
│   ├── shared/           # Types, constants
│   ├── game-engine/      # Pure game logic
│   └── database/         # Prisma schema
└── docs/
    ├── plans/            # Design docs
    └── assets/           # Game art + workflow
```

## Scripts

```bash
npm run dev           # Start all services
npm run dev:web       # Frontend only
npm run dev:api       # Backend only
npm run build         # Build everything
npm run db:migrate    # Run migrations
npm run db:studio     # Open Prisma Studio
npm run typecheck     # TypeScript check
```

## Game Features (MVP)

- **Turn Economy**: 1 turn/sec regeneration, 18hr bank cap
- **Skills**: Melee, Ranged, Magic, Defence, Vitality, Evasion, Mining, Weaponsmithing
- **Combat**: D&D-style resolution with logs
- **Exploration**: Probability-based encounters
- **Equipment**: 11 slots with durability
- **Crafting**: Weaponsmithing from gathered resources

## API Endpoints

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
GET    /api/v1/turns
POST   /api/v1/turns/spend
GET    /api/v1/player
GET    /api/v1/player/skills
GET    /api/v1/player/equipment
```

## License

Private - All rights reserved
