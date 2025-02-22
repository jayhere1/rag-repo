#!/bin/bash

# Start services in the background
echo "Starting Weaviate..."
docker-compose up -d

echo "Starting backend server..."
cd backend
source venv/bin/activate
python3 -m uvicorn app.main:app --reload --port 8001 &
BACKEND_PID=$!

echo "Starting frontend dev server..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Handle cleanup on script termination
cleanup() {
    echo "Shutting down services..."
    kill $BACKEND_PID
    kill $FRONTEND_PID
    docker-compose down
    exit 0
}

trap cleanup SIGINT SIGTERM

# Keep script running
wait
