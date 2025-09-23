# The Cycle – MLB Analytics Platform

A full-stack MLB analytics platform focused on exhaustive statistical coverage: traditional stats, advanced sabermetrics, situational splits, and experimental metrics.

- Frontend: React + Material UI (src/web-frontend)
- Backend: Express.js API (src/express-backend)
- Data Layer: Azure Redis (primary), local Redis for dev
- Ingestion: MLB Stats API → Redis (boxscores, play-by-play)

## How the pieces connect
- Frontend → Backend: HTTP REST calls to Express under `/api` (proxy in dev)
  - Dev proxy: `src/web-frontend/package.json` → `proxy: http://localhost:8081`
- Backend → Redis: ioredis singleton (`src/express-backend/src/utils/redis.js`)
- Ingestion scripts write canonical keys; API serves them:
  - Player season/game keys: `player:TEAM-Player_Name-YEAR:*`
  - Team season/game keys: `team:TEAM:YEAR:*`
  - Macro splits (canonical):
    - Player: `splits:player:TEAM-Player_Name-YEAR`
    - Team: `splits:team:TEAM:YEAR`

## Primary API surfaces
All routes are hosted by the backend (see `README_BACKEND.md` for the full list).

- Health:
  - GET `/api/health`
  - GET `/api/redis-health`
- v2 Endpoints:
  - Players: `/api/v2/players/*`
  - Teams: `/api/v2/teams/*`
  - Stats: `/api/v2/stats/*`
  - Games: `/api/v2/games/*`
  - MLB Live: `/api/v2/mlb-live/*`
  - Splits (macro): `/api/v2/splits/macro/*`

## Local development
- Backend only: `cd src/express-backend && npm run dev` (port 8081 or 8080 per server config)
- Frontend only: `cd src/web-frontend && npm start` (CRA dev server; proxies to backend)
- Full Docker: `./run-docker.sh dev` (hot reload) or `./run-docker.sh` (prod)

## Data ingestion (scripts)
Run from `src/express-backend`:
- `node scripts/pullBoxscoreRedis.cjs` – season/game boxscores → Redis
- `node scripts/pullPlayByPlaySplits.cjs` – play-by-play → macro splits
- Cache helpers: `scripts/clear*.cjs`, `scripts/getRedisKey.cjs`

## Project conventions
- Theme: Material UI with team color theming via `theme/theme.js`
- API calls: use `src/web-frontend/src/services/apiService.js` (retry + error handling)
- Splits: Frontend fetches a single macro per player/team and derives subtrees client-side

## Deploy
- Azure pipeline via `run-dev.sh` and Azure DevOps. See repo scripts for details.
