# Backend with Python - serve both frontend and backend
FROM python:3.11-slim

WORKDIR /app

# Install nginx and Node.js for serving
RUN apt-get update && \
    apt-get install -y nginx curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Copy and install backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./

# Copy frontend source (no build needed for dev mode)
COPY frontend/ ./frontend/

# Install frontend dependencies and build with installed vite
WORKDIR /app/frontend
RUN npm install && npm run build

WORKDIR /app

# Copy built frontend to nginx location
RUN mkdir -p /usr/share/nginx/html && \
    cp -r /app/frontend/dist/* /usr/share/nginx/html/

# Copy nginx config
COPY nginx-combined.conf /etc/nginx/conf.d/default.conf
RUN rm -f /etc/nginx/sites-enabled/default

# Create startup script
RUN echo '#!/bin/bash\n\
service nginx start\n\
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}' > /app/start.sh && \
chmod +x /app/start.sh

EXPOSE ${PORT:-8000}

CMD ["/bin/bash", "/app/start.sh"]
