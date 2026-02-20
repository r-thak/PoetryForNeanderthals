FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install

COPY . .
RUN bun run build

FROM oven/bun:1
WORKDIR /app

# Copy the build output
COPY --from=builder /app/build ./build
# Copy the server source
COPY --from=builder /app/src/server ./src/server
# Copy the lib source since the server imports from it
COPY --from=builder /app/src/lib ./src/lib
# Copy config and manifest files
COPY --from=builder /app/package.json /app/tsconfig.json /app/bun.lock* ./
# Copy node_modules
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 22222
ENV ORIGIN=http://localhost:22222
CMD ["bun", "src/server/index.ts"]