#!/bin/bash
echo "Setting up CopyCloud..."
npm install
if [ ! -f .env ]; then
  cp .env.example .env 2>/dev/null || echo "No .env.example found"
fi
echo "Setup complete! Run npm run dev to start."
