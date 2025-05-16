# React Backend for Baseball Roster API

This backend provides an API endpoint `/api/roster?team=TEAM_CODE` that scrapes player names, positions, and stats from ESPN for any MLB team.

## Usage

- Install dependencies: `npm install`
- Run in dev mode: `npm run dev`
- Build: `npm run build`
- Start (after build): `npm start`

## API
- `GET /api/roster?team=TEAM_CODE` — Returns a list of player names, positions, and stats for the given team code (e.g., `nyy` for Yankees, `bos` for Red Sox, etc.)
