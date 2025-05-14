FROM node:20-alpine AS base

# PNPM ve temel bağımlılıkları yükle
RUN apk add --no-cache libc6-compat && \
    npm install -g pnpm@latest

# -----------------------------------------------------------------------------
# Builder Aşaması: Bağımlılıkları yükle ve uygulamayı build et
# -----------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app

# Sadece bağımlılık manifest dosyalarını kopyala
COPY package.json pnpm-lock.yaml ./
COPY .npmrc .npmrc

# Bağımlılıkları yükle
RUN pnpm install --frozen-lockfile -r

# Prisma Client oluştur
COPY prisma ./prisma
RUN pnpm prisma:generate

# Kaynak kodunun tamamını kopyala
COPY . .

# Uygulamayı build et
ARG NEXT_PUBLIC_APP_URL="http://localhost:3000"
ARG DATABASE_URL="postgresql://builduser:buildpass@buildhost:5432/builddb?schema=public"
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV DATABASE_URL=${DATABASE_URL}
ENV IS_DOCKER_BUILD=true
RUN pnpm build

# -----------------------------------------------------------------------------
# Runner Aşaması: Üretim imajını oluştur
# -----------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

# Root olmayan bir kullanıcı oluştur ve kullan
RUN addgroup --system --gid 1001 nextjs && \
    adduser --system --uid 1001 nextjs
USER nextjs

# Builder aşamasından sadece gerekli dosyaları kopyala
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src

# Ortam değişkenlerini ayarla
ENV NODE_ENV=production
# ENV PORT=3000 # Genellikle Next.js bunu kendi yönetir

# Uygulamanın çalışacağı portu belirt
EXPOSE 3000

# Uygulamayı başlat
CMD ["pnpm", "start"] 