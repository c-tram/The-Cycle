# The Cycle – Express Backend

This backend powers The Cycle MLB analytics platform. It exposes a REST API over Redis-cached MLB data, supports both season and game-level stats, and provides macro-key situational splits for exhaustive analytics.

- Runtime: Node.js + Express (port 8080)
- Data store: Azure Redis (JSON strings) with local fallback
- Data ingestion: Node scripts (boxscores, play-by-play, macro splits)
- API surface: v2 is primary; v1 routes map to v2 for compatibility

## Run it
- Dev (backend only): `cd src/express-backend && npm run dev`
- Health checks:
  - GET `/api/health` – server liveness
  - GET `/api/redis-health` – Redis liveness
  - GET `/api/redis-debug` – quick Redis key sanity (summary:*)

## Data model (Redis keys)
- Player season: `player:TEAM-Player_Name-YEAR:season`
- Player game: `player:TEAM-Player_Name-YEAR:YYYY-MM-DD-GAMEID`
- Team season: `team:TEAM:YEAR:season`
- Team game: `team:TEAM:YEAR:YYYY-MM-DD-GAMEID`
- Macro splits (canonical):
  - Player macro: `splits:player:TEAM-Player_Name-YEAR`
  - Team macro: `splits:team:TEAM:YEAR`
- Legacy split keys: `split:*` (older granular per-split keys; may be absent if using macro-only setup)

## API index (current server wiring)
All routes below are mounted in `src/express-backend/src/server.js`.

### Health and diagnostics
- GET `/api/health` – server status
- GET `/api/redis-health` – Redis status
- GET `/api/redis-debug` – sample summary keys snapshot

### Players (v2) – `/api/v2/players` (also aliased under `/api/players`)
- GET `/` – list players with filters (team, year, position, status, sortBy, sortOrder, minGames, playerType, startDate, endDate)
- GET `/:playerId` – player season card (query: `year`, `includeGameLog`)
- GET `/:playerId/splits` – situational splits from game logs (query: `year`, `splitType`)
- GET `/:playerId/trends` – rolling trends/projections (query: `year`, `period`)
- POST `/compare` – compare multiple players (body: `players[]`, `year`, `categories`, `metrics`)
- GET `/team/:teamId` – team roster with per-player summaries (query: `year`, `sortBy`, `category`)
- GET `/search` – player search (query: `q`, `year`, `team`, `position`, `minGames`, `limit`)

### Teams (v2) – `/api/v2/teams` (also aliased under `/api/teams`)
- GET `/` – list teams with season summaries (query: `year`, `league`, `division`, `sortBy`)
- GET `/standings` – league/division standings (query: `year`)
- GET `/:teamId` – team season card (query: `year`, `includeRoster`)
- GET `/:teamId/schedule` – schedule/results (query: `year`, `month`, `limit`)
- GET `/:teamId/splits` – team situational splits (query: `year`, `splitType`)
- POST `/compare` – multi-team comparison (body: `teams[]`, `year`, `categories`)

### Stats (v2) – `/api/v2/stats` (also aliased under `/api/stats`)
- GET `/summary` – cached dataset summary
- GET `/leaders` – stat leaders (query: `category`, `stat`, `team`, `year`, `limit`, minimums)
- GET `/advanced/:playerId` – advanced player analytics (uses season + game logs)
- GET `/splits/:playerId` – player splits (derived from game logs)
- POST `/compare/advanced` – advanced multi-player comparison
- GET `/team/:teamId/advanced` – team advanced analytics
- Salary:
  - GET `/salary/:team/:player/:year`
  - GET `/salary/team/:team/:year`
  - GET `/salary/all/:year`
- Cycle Value Rating (CVR):
  - GET `/cvr/:team/:player/:year`
  - GET `/cvr/:playerA/:playerB` (compare two players)

### Games (v2) – `/api/v2/games`
- GET `/recent` – recent games for a date (query: `date`, `limit`)
- GET `/live` – live games today
- GET `/schedule/:date` – schedule for date (query: `limit`)
- GET `/range` – games in a date range (query: `startDate`, `endDate`, `limit`)

### MLB live proxy (v2) – `/api/v2/mlb-live`
- GET `/schedule/:date` – direct MLB Stats API schedule proxy
- GET `/boxscore/:gameId` – detailed live boxscore + PBP
- GET `/today` – alias for today’s schedule

### Splits (macro, v2) – `/api/v2/splits` (canonical for new splits)
Backed by consolidated macro keys; supports optional subtree selection via `?path=`.
- GET `/macro/player/:team/:player/:season` – full player macro splits
  - Optional: `?path=by_location.home` or `compound.count_vs_pitcher.MIA-Anthony_Bender.2-2.away`
- GET `/macro/team/:team/:season` – full team macro splits
  - Optional: `?path=by_location.away`

### Splits (legacy/experimental, v2) – `/api/v2/splits`
These query older `split:*` keys (per-split writes). If you’ve migrated to macro-only storage, these may return empty arrays until legacy keys exist.
- GET `/home-away/:team/:player/:season`
- GET `/venue/:team/:player/:season`
- GET `/vs-teams/:team/:player/:season`
- GET `/vs-pitcher/:team/:player/:season/:opponent/:pitcher`
- GET `/handedness/:team/:player/:season`
- GET `/handedness-vs-team/:team/:player/:season/:opponent`
- GET `/counts/:team/:player/:season`
- GET `/counts-vs-team/:team/:player/:season/:opponent`
- GET `/counts-vs-venue/:team/:player/:season/:venue`
- GET `/counts-vs-handedness/:team/:player/:season/:handedness`
- GET `/team-matchup/:homeTeam/:awayTeam/:season`
- GET `/pitcher-vs-batter/:team/:pitcher/:season/:opponent/:batter`
- GET `/search/:team/:player/:season`

### Splits discovery and helpers (v2)
- GET `/api/v2/splits/discover` – inventory of available legacy split keys
- GET `/api/v2/splits/players/available-players` – players with legacy split data
- GET `/api/v2/splits/players/vs-pitcher/:team/:player/:season` – legacy batter vs pitcher index

### Matchups (legacy split keys) – `/api/matchups`
- GET `/players` – player vs team matchups (query: team, opponent, year, limit)
- GET `/teams` – team vs team matchups (query: team, opponent, year, limit)
- GET `/players/:team/:name/:year/vs/:opponent/games` – per-game series
- GET `/teams/:team/vs/:opponent/games` – per-game series

### Standings – `/api/standings`
- GET `/` – division/league standings (query: `year`)
- GET `/division/:division` – single-division view (query: `year`)
- GET `/wildcard/:league` – league wild card race (query: `year`)
- GET `/test` – mock data (no Redis)

### Compatibility aliases (v1 → v2)
- `/api/players` → `/api/v2/players`
- `/api/teams` → `/api/v2/teams`
- `/api/stats` → `/api/v2/stats`

## What’s “active” vs “legacy” right now?
- Active/canonical splits: the macro endpoints under `/api/v2/splits/macro/*` (keys `splits:player:*` and `splits:team:*`).
- Legacy/experimental: endpoints that query `split:*` keys. If those keys aren’t populated in your environment, responses may be empty. Keep them for reference or migration, but prefer macro for production.

## Ingestion scripts (backend/scripts)
- `pullBoxscoreRedis.cjs` – pulls boxscores → player/team season + game keys
- `pullPlayByPlaySplits.cjs` – builds macro split objects and writes `splits:*` keys
- Helpers: `queryRedisStats.cjs`, `getRedisKey.cjs`, `clear*` scripts

## Notes
- CORS: allows localhost 3000/3001 in dev; set `FRONTEND_URL` in prod
- Error handling: structured 500s; 404 for missing keys/paths
- Graceful shutdown: disconnects Redis on SIGINT/SIGTERM
