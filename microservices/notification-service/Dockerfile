# Build stage
FROM node:21-alpine3.18 AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY .npmrc ./
COPY src ./src
COPY tools ./tools

# Use Corepack to get latest compatible npm safely
RUN corepack enable && corepack prepare npm@latest --activate

# Clean install with locked versions
RUN rm -rf node_modules package-lock.json && npm install

# Build the project
RUN npm run build

# Runtime stage
FROM node:21-alpine3.18

WORKDIR /app

RUN apk add --no-cache curl

COPY package*.json ./
COPY tsconfig.json ./
COPY .npmrc ./

RUN npm install -g pm2
RUN npm ci --production

COPY --from=builder /app/build ./build

EXPOSE 4001

CMD ["npm", "run", "start"]
