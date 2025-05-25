# The Cycle - MLB Statcast Web App

This project is a full-stack web application built with a **React frontend and backend**, containerized using **Docker**, and designed for easy scaling and deployment with **Azure DevOps** and Azure cloud services.

## Features

- **React Frontend & Backend**: Modern JavaScript/TypeScript stack for both client and server.
- **Dockerized**: The entire app runs in a Docker container for consistency across environments.
- **Azure-Ready**: Built to deploy and scale on Azure using Azure DevOps pipelines or manual workflows.
- **Statcast Data**: Scrapes and displays MLB Statcast data for teams and players.
- **Searchable UI**: Search and select MLB teams, view player stats, and filter data.

## Getting Started

1. **Install dependencies**
   ```sh
   npm install
   ```

2. **Run locally**
   ```sh
   npm start
   ```
   - App: [http://localhost:3000/](http://localhost:3000/)
   - API: [http://localhost:3000/api/roster](http://localhost:3000/api/roster)

## Docker Usage

1. **Build the Docker image**
   ```sh
   docker build -t the-cycle-app .
   ```

2. **Run the container**
   ```sh
   docker run -p 3000:3000 the-cycle-app
   ```

## Azure Deployment

- **Azure DevOps**: Set up a pipeline to build and deploy the Docker image to Azure Web App for Containers or Azure Kubernetes Service.
- **Manual Deployment**: Push your Docker image to Azure Container Registry and deploy via the Azure Portal.

## API Endpoint

- `GET /api/roster` — Returns MLB Statcast player data for the selected team.

## Running Tests

### Backend (react-backend)

1. Install dependencies:
   ```sh
   cd src/react-backend
   npm install
   ```
2. Run tests with coverage:
   ```sh
   npm test
   ```
   - Uses **Jest** for TypeScript unit tests. All `*.test.ts` files in `src/react-backend/src/` are run.
   - Coverage report is generated in the `coverage/` folder.

### Frontend (react-frontend)

1. Install dependencies:
   ```sh
   cd src/react-frontend
   npm install
   ```
2. Run tests with coverage:
   ```sh
   npm test
   ```
   - Uses **Vitest** for TypeScript/React unit tests. All `*.test.ts` files in `src/react-frontend/src/` are run.
   - Coverage report is generated in the `coverage/` folder.

---

**Built with React, Node.js, TypeScript, Docker, and Azure.**
