#!/bin/bash

echo "Starting development environment..."

# Start all services
echo "Starting services..."
docker-compose -f docker-compose.dev.yml up --build -d

# Handle cleanup on script termination
cleanup() {
    echo "Shutting down services..."
    docker-compose -f docker-compose.dev.yml down
    exit 0
}

trap cleanup SIGINT SIGTERM

# Show logs from all services
echo "Showing logs from all services..."
docker-compose -f docker-compose.dev.yml logs -f
