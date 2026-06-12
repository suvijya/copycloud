FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY apps/server/package.json ./
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN npm install

# Copy source code
COPY apps/server/ ./apps/server/
COPY packages/shared/ ./packages/shared/

# Build shared package
RUN cd packages/shared && npm run build

# Build server
RUN cd apps/server && npm run build

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "apps/server/dist/index.js"]