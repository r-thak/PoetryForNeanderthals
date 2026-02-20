FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install

COPY . .
RUN bun run build

FROM oven/bun:1
WORKDIR /app

COPY --from=builder /app/build ./build
COPY --from=builder /app/src/server ./src/server
COPY --from=builder /app/src/lib ./src/lib
COPY --from=builder /app/package.json /app/bun.lock* ./
COPY --from=builder /app/node_modules ./node_modules

RUN echo '{"compilerOptions": {"baseUrl": ".", "paths": {"$lib": ["./src/lib"], "$lib/*": ["./src/lib/*"]}, "moduleResolution": "bundler"}}' > tsconfig.json

EXPOSE 22222
ENV ORIGIN=http://localhost:22222
CMD ["bun", "src/server/index.ts"]