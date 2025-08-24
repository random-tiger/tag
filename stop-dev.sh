#!/bin/bash

# Tag Development Stop Script

echo "🛑 Stopping Tag Development Servers..."
echo "====================================================="

# Kill backend server
if [ -f "backend/backend.pid" ]; then
    echo "🌐 Stopping Flask backend server..."
    kill $(cat backend/backend.pid) 2>/dev/null
    rm backend/backend.pid
    echo "   Backend server stopped"
else
    echo "   No backend PID file found"
fi

# Kill frontend server
if [ -f "frontend/frontend.pid" ]; then
    echo "⚛️  Stopping React development server..."
    kill $(cat frontend/frontend.pid) 2>/dev/null
    rm frontend/frontend.pid
    echo "   Frontend server stopped"
else
    echo "   No frontend PID file found"
fi

# Kill any remaining processes on common ports
echo "🧹 Cleaning up any remaining processes..."

# Kill processes on port 3000 (React)
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null; then
    echo "   Killing process on port 3000..."
    kill -9 $(lsof -Pi :3000 -sTCP:LISTEN -t) 2>/dev/null
fi

# Kill processes on port 8080 (Flask)
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null; then
    echo "   Killing process on port 8080..."
    kill -9 $(lsof -Pi :8080 -sTCP:LISTEN -t) 2>/dev/null
fi

# Clean up log files (optional)
echo "🧹 Log files preserved:"
[ -f "backend/backend.log" ] && echo "   Backend: backend/backend.log"
[ -f "frontend/frontend.log" ] && echo "   Frontend: frontend/frontend.log"

echo ""
echo "✅ All development servers stopped successfully!"
echo "👋 Have a great day!"
