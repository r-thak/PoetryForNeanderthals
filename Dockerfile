FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/src/server ./src/server
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 22222
ENV ORIGIN=http://localhost:22222
CMD ["bun", "src/server/index.ts"]