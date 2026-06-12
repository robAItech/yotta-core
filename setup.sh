#!/bin/bash
# Copy .env.example to .env if not exists
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env — customize your password"
fi
