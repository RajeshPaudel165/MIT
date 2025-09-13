#!/bin/zsh
# Activate Python venv and start Flask backend
cd "$(dirname "$0")/Backend"

# Kill any existing processes on port 5001
lsof -ti:5001 | xargs kill -9 2>/dev/null || true

# Use absolute paths that we know work
echo "🚀 Starting Flask backend server..."
/Users/rajesh/Desktop/MIT/Backend/venv/bin/python /Users/rajesh/Desktop/MIT/Backend/app.py