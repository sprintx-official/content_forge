FROM node:22-alpine AS build

WORKDIR /app

# Install root dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Install server dependencies
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci

# Copy all source code
COPY . .

# Build frontend (tsc -b && vite build)
RUN npm run build

# Build server (tsc)
RUN cd server && npm run build

# --- Production stage ---
FROM node:22-alpine

WORKDIR /app

# Install only server production dependencies
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

# Copy built server (includes public folder with frontend)
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/public ./server/public

EXPOSE 3000

CMD ["node", "server/dist/index.js"]
