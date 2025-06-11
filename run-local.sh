#!/bin/bash
# Run both backend and frontend locally for The Cycle project

# Exit on error
set -e

# Start backend (Express/Node)
echo "Starting backend (react-backend)..."
cd src/react-backend
npm install
npm run dev &
BACKEND_PID=$!
cd ../..

# Start frontend (Vite/React)
echo "Starting frontend (react-frontend)..."
cd src/react-frontend
npm install
npm run dev &
FRONTEND_PID=$!
cd ../..

# Wait for both processes
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait $BACKEND_PID $FRONTEND_PID
