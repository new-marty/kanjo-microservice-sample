FROM node:22-slim

# Install Playwright dependencies
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

# Enable corepack for pnpm
RUN corepack enable

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY tooling/typescript ./tooling/typescript/
COPY jobs/scraper/package.json ./jobs/scraper/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Install Playwright browsers
RUN cd jobs/scraper && npx playwright install chromium

# Copy scraper source
COPY jobs/scraper ./jobs/scraper/

# Set working directory to scraper
WORKDIR /app/jobs/scraper

# Create user data directory for browser session
RUN mkdir -p /app/.mf-user-data && chmod 700 /app/.mf-user-data

ENV MF_USER_DATA_DIR=/app/.mf-user-data

CMD ["pnpm", "start", "fetch-daily"]
