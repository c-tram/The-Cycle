#!/bin/zsh
# Run The Cycle Flutter Web App with Express Backend
# This script starts the backend and launches the Flutter web frontend

# Exit on error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[The Cycle Flutter]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Cleanup function
cleanup() {
    print_status "Shutting down services..."
    if [[ -n $BACKEND_PID ]]; then
        kill $BACKEND_PID 2>/dev/null || true
        print_status "Backend stopped"
    fi
    if [[ -n $FLUTTER_PID ]]; then
        kill $FLUTTER_PID 2>/dev/null || true
        print_status "Flutter web server stopped"
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM EXIT

print_status "Starting The Cycle - Flutter Web Edition"
print_status "========================================"

# Check if Flutter is installed
if ! command -v flutter &> /dev/null; then
    print_error "Flutter is not installed or not in PATH"
    print_error "Please install Flutter: https://docs.flutter.dev/get-started/install"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed or not in PATH"
    print_error "Please install Node.js: https://nodejs.org/"
    exit 1
fi

# Start the Express backend
print_status "Starting Express backend..."
cd src/react-backend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing backend dependencies..."
    npm install
fi

# Start backend in background
print_status "Launching backend server on http://localhost:3000"
npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Return to root directory
cd ../..

# Prepare Flutter web app
print_status "Preparing Flutter web application..."
cd src/the_cycle_flutter

# Get Flutter dependencies
print_status "Getting Flutter dependencies..."
flutter pub get

# Enable web if not already enabled
print_status "Ensuring Flutter web is enabled..."
flutter config --enable-web 2>/dev/null || true

# Build Flutter web app for development
print_status "Building Flutter web app..."
flutter build web --web-renderer html --dart-define=BACKEND_URL=http://localhost:3000

# Start Flutter web server
print_status "Starting Flutter web server..."
print_success "Frontend will be available at: http://localhost:8080"
print_success "Backend API available at: http://localhost:3000"
print_status ""
print_status "Press Ctrl+C to stop both servers"
print_status "========================================"

# Start Flutter web server
flutter run -d web-server --web-port=8080 --web-hostname=localhost &
FLUTTER_PID=$!

# Wait for user to stop the services
wait $FLUTTER_PID
