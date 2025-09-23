# The Cycle – Frontend (React + MUI)

Professional MLB analytics UI built with React, Material UI, Chart.js, and Framer Motion.

- Dev server: CRA (default port 3000)
- Backend proxy: `proxy: http://localhost:8081` (see `package.json`)
- Source: `src/web-frontend/src`

## Run locally
- `cd src/web-frontend`
- `npm install`
- `npm start`
  - Opens http://localhost:3000 and proxies API requests to the backend

## Build
- `npm run build` → optimized production bundle in `src/web-frontend/build`

## API endpoints used by the frontend
All calls are made through `src/web-frontend/src/services/apiService.js`.

- Health
  - GET `/api/health`
  - GET `/api/redis-health`

- Players (v2)
  - GET `/api/v2/players` – list/filter players
  - GET `/api/v2/players/:playerId` – player card
  - GET `/api/v2/players/search` – live player search (q, season, team, limit)

- Teams (v2)
  - GET `/api/v2/teams` – list teams
  - GET `/api/v2/teams/:teamId` – team card
  - GET `/api/v2/teams/standings` – standings

- Stats (v2)
  - GET `/api/v2/stats/summary`
  - GET `/api/v2/stats/leaders` – leaders (category/stat filters)
  - GET `/api/v2/stats/cvr/:team/:player/:year` – Cycle Value Rating

- Games and Live (v2)
  - GET `/api/v2/games/recent` | `/api/v2/games/live`
  - GET `/api/v2/mlb-live/boxscore/:gameId` – detailed live data

- Splits (macro, v2)
  - GET `/api/v2/splits/macro/player/:team/:player/:season`
  - GET `/api/v2/splits/macro/team/:team/:season`
  - Optional `?path=dot.path` to return a subtree

## Frontend patterns
- Theme: `theme/theme.js` with `createAppTheme()` and team color palettes
- API service: centralized axios client with retry and 30s timeout
- SplitsExplorer: fetch one macro key and derive subtrees client-side
- Autocomplete: live search via `/api/v2/splits/players/search`
- Logos: ESPN mapping helper at `src/web-frontend/src/utils/teamLogos.js`

## Troubleshooting
- If API calls 404/timeout in dev, ensure backend is running on 8081/8080 and CRA proxy matches.
- Use `/api/health` and `/api/redis-health` to verify connectivity.
- To inspect cached data, from `src/express-backend` run `node scripts/getRedisKey.cjs <key>`.
