FROM node:20-alpine as dev_base
# 更新为国内源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories
# 设置环境变量

# Build dependencies
RUN apk --update --no-cache add make gcc g++ python3 curl

# Avoid "gyp ERR! stack Error: certificate has expired"
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
ENV NX_DAEMON=false

RUN npm config set registry https://registry.npmmirror.com --global
RUN npm i pm2 nan -g
RUN npm --no-update-notifier --no-fund --global install pnpm@8.12.1
RUN pnpm --version


WORKDIR /usr/src/app

# ------- DEV BUILD ----------
FROM dev_base AS dev
ARG PACKAGE_PATH


COPY  ./meta .
COPY  ./deps .
COPY  ./pkg .

RUN --mount=type=cache,id=pnpm-store-webhook,target=/root/.pnpm-store\
 pnpm install --reporter=silent --filter "novuhq" --filter "{${PACKAGE_PATH}}..."\
 --no-frozen-lockfile\
 --unsafe-perm

RUN NODE_ENV=production pnpm build:webhook

WORKDIR /usr/src/app/apps/webhook

RUN cp src/.example.env dist/src/.env
RUN cp src/.env.test dist/src/.env.test
RUN cp src/.env.development dist/src/.env.development
RUN cp src/.env.production dist/src/.env.production

WORKDIR /usr/src/app

# ------- ASSETS BUILD ----------
FROM dev AS assets

WORKDIR /usr/src/app

# Remove all dependencies so later we can only install prod dependencies without devDependencies
RUN rm -rf node_modules && pnpm recursive exec -- rm -rf ./src ./node_modules

# ------- PRODUCTION BUILD ----------
FROM dev_base AS prod
ARG PACKAGE_PATH

ENV CI=true

WORKDIR /usr/src/app

COPY  ./meta .

# Get the build artifacts that only include dist folders
COPY  --from=assets /usr/src/app .

RUN --mount=type=cache,id=pnpm-store-webhook,target=/root/.pnpm-store\
 pnpm install --reporter=silent --filter "{${PACKAGE_PATH}}..."\
 --no-frozen-lockfile\
 --unsafe-perm

WORKDIR /usr/src/app/apps/webhook
CMD [ "pm2-runtime", "dist/main.js" ]
