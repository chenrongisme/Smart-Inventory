# Smart Inventory - Production Dockerfile
# Multi-stage: builder stage for frontend, runner stage for runtime
# Final image uses Alpine for minimal size

# ── Stage 1: Build frontend ────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++
RUN ln -sf /usr/bin/python3 /usr/bin/python

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ── Stage 2: Production runtime ───────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# pg (node-postgres) is pure JavaScript - NO build tools needed!

COPY package*.json tsconfig.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/server.ts ./

# Install production deps only
RUN npm install --omit=dev \
    && rm -rf /tmp/* /var/cache/apk/*

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodeapp -u 1001

RUN mkdir -p /app/uploads /app/data && chown -R nodeapp:nodejs /app
USER nodeapp

EXPOSE 3000

CMD ["node_modules/.bin/tsx", "server.ts"]
