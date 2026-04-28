#!/bin/bash

cd "$(dirname "$0")"

echo "Starting MongoDB..."
docker compose up -d mongodb

echo "Installing dependencies..."
npm run install:all

echo "Starting OpenConnect (server + client)..."
npm run dev
