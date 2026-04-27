# Worker Dockerfile - separate from Next.js app
FROM node:20-alpine

RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm ci --omit=dev

# Generate Prisma client
RUN npx prisma generate

# Copy worker code
COPY worker ./worker

# Run worker
CMD ["node", "worker/thumbnail-worker.js"]