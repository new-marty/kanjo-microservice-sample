FROM python:3.12-slim

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy project files
COPY jobs/transform/pyproject.toml jobs/transform/

# Install dependencies
RUN cd jobs/transform && uv sync --frozen --no-dev

# Copy source code
COPY jobs/transform/src jobs/transform/src

# Set working directory
WORKDIR /app/jobs/transform

# Default command: listen mode
CMD ["uv", "run", "transform", "listen"]
