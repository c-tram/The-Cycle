#!/bin/zsh
# Run both frontend and backend in parallel

cd "$(dirname "$0")"

# Start backend
echo "Starting backend..."
cd react-backend && npm install && npm run dev &
BACKEND_PID=$!
cd ..

# Start frontend
echo "Starting frontend..."
cd react-frontend && npm install && npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for both to exit
wait $BACKEND_PID $FRONTEND_PID
