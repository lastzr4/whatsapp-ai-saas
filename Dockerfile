FROM node:20-bullseye-slim

# Install system dependencies needed by:
# - better-sqlite3 (python3, make, g++)
# - puppeteer/chromium (chromium + deps)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    chromium \
    chromium-sandbox \
    fonts-liberation \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell puppeteer to use system chromium instead of downloading its own
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Install backend dependencies
COPY backend/package.json ./backend/
RUN npm install --prefix backend

# Install & build frontend
COPY frontend/package.json ./frontend/
RUN npm install --prefix frontend
COPY frontend/ ./frontend/
RUN npm run build --prefix frontend

# Copy backend source
COPY backend/ ./backend/
COPY package.json ./

# Create data directories (will be overridden by Railway volume)
RUN mkdir -p /data/data /data/uploads /data/sessions

EXPOSE 3001

CMD ["node", "backend/server.js"]
