FROM node:20-bullseye-slim

# Install system dependencies
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

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV DATA_PATH=/data
ENV NODE_ENV=production

WORKDIR /app

# Copy everything first
COPY . .

# Install backend & frontend, then build
RUN npm install --prefix backend
RUN npm install --prefix frontend --include=dev
RUN npm run build --prefix frontend

# Create data directories (overridden by Railway volume)
RUN mkdir -p /data/data /data/uploads /data/sessions

EXPOSE 3001

CMD ["node", "backend/server.js"]
