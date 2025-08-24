#!/bin/bash

# Tag Development Startup Script

echo "🚀 Starting Tag Development Environment"
echo "======================================================"

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check for service account key
if [ ! -f "service-account-key.json" ]; then
    echo "⚠️  Warning: service-account-key.json not found"
    echo "   Please ensure your Google Cloud service account key is in the root directory"
fi

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null; then
        echo "⚠️  Port $1 is already in use"
        return 1
    else
        return 0
    fi
}

# Check required ports
echo "🔍 Checking ports..."
check_port 3000 || echo "   Frontend may not start on port 3000"
check_port 8080 || echo "   Backend may not start on port 8080"

echo ""
echo "🏗️  Setting up Backend..."
echo "------------------------"

# Backend setup
cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Install backend dependencies
echo "📥 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Start backend in background (absolute log path, unbuffered output)
echo "🌐 Starting Flask backend server..."
BACKEND_LOG="$(pwd)/backend.log"
PYTHONUNBUFFERED=1 venv/bin/python app.py >> "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
echo "   Backend logs: $BACKEND_LOG"

# Store backend PID for cleanup
echo $BACKEND_PID > backend.pid

cd ..

echo ""
echo "🎨 Setting up Frontend..."
echo "-------------------------"

# Frontend setup
cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

# Environment file already created

# Start frontend in background (absolute log path)
echo "⚛️  Starting React development server..."
FRONTEND_LOG="$(pwd)/frontend.log"
npm start >> "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
echo "   Frontend logs: $FRONTEND_LOG"

# Store frontend PID for cleanup
echo $FRONTEND_PID > frontend.pid

cd ..

echo ""
echo "✅ Tag Started Successfully!"
echo "==========================================="
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🖥️  Backend API: http://localhost:8080"
echo "📚 API Health: http://localhost:8080/health"
echo ""
echo "🛑 To stop the development servers:"
echo "   Press Ctrl+C or run: ./stop-dev.sh"
echo ""
echo "📋 Next Steps:"
echo "   1. Configure your .env files with proper values"
echo "   2. Ensure your Google Cloud credentials are set up"
echo "   3. Open http://localhost:3000 to start creating stories!"
echo ""
echo "📊 To monitor logs:"
echo "   Backend: tail -f backend/backend.log"
echo "   Frontend: tail -f frontend/frontend.log"
echo ""

# Function to cleanup on script exit
cleanup() {
    echo ""
    echo "🛑 Shutting down development servers..."
    
    if [ -f "backend/backend.pid" ]; then
        kill $(cat backend/backend.pid) 2>/dev/null
        rm backend/backend.pid
    fi
    
    if [ -f "frontend/frontend.pid" ]; then
        kill $(cat frontend/frontend.pid) 2>/dev/null
        rm frontend/frontend.pid
    fi
    
    echo "👋 Development servers stopped"
    exit 0
}

# Setup trap for cleanup
trap cleanup SIGINT SIGTERM

# Stream logs to terminal
echo "📡 Streaming logs (Ctrl+C to stop)..."
# Ensure log files exist before tailing
touch "$BACKEND_LOG" "$FRONTEND_LOG"
tail -n +1 -F "$BACKEND_LOG" "$FRONTEND_LOG"
