# Azure Empty Project

This is a minimal TypeScript project scaffolded as a starting point for Azure development.

## Getting Started

- Install dependencies: `npm install`
- Run the project: `npm start`

## Docker Usage

- Build the Docker image: `docker build -t azure-baseball-app .`
- Run the container: `docker run -p 3000:3000 azure-baseball-app`
- Access the app: `http://localhost:3000/`
- Access the API directly: `http://localhost:3000/api/roster`

## API Endpoint

- `GET /api/roster` — Returns a list of player names and positions scraped from ESPN Yankees roster (as an example).
