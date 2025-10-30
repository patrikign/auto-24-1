FROM oven/bun:1

WORKDIR /app

# Copy project files
COPY package.json package-lock.json* ./
COPY . .

# Install production deps
RUN bun install --production

# Default command runs the seeder (reads .env or environment variables)
CMD ["bun", "run", "seed"]
