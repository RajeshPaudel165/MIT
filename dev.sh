#!/bin/zsh
# Start backend and frontend automatically in new Terminal windows (macOS)

open -a Terminal "$(pwd)/start-backend.sh"
open -a Terminal "$(pwd)/start-frontend.sh"
