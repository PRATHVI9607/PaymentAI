# Multi-stage build: Frontend + Backend in one container
FROM node:18-alpine AS frontend-build

WORKDIR /frontend

# Install dependencies and build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --include=dev || npm install
COPY frontend/ ./
RUN npm run build

# Backend stage with Python
FROM python:3.11-slim

WORKDIR /app

# Install nginx for serving frontend
RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*

# Copy backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./

# Copy built frontend from previous stage
COPY --from=frontend-build /frontend/dist /app/frontend/dist

# Copy nginx config
COPY nginx-combined.conf /etc/nginx/sites-available/default

# Create startup script
RUN echo '#!/bin/bash\n\
nginx\n\
uvicorn app.main:app --host 0.0.0.0 --port 8000' > /app/start.sh && \
chmod +x /app/start.sh

EXPOSE 80 8000

CMD ["/app/start.sh"]
