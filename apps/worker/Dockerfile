FROM node:20-alpine as dev_base
# 更新为国内源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories
# 设置环境变量

# Build dependencies
RUN apk --update --no-cache add curl g++ make py3-pip
# https://github.com/newrelic/node-native-metrics/pull/112
# RUN apk --update --no-cache add libexecinfo libexecinfo-de
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

RUN --mount=type=secret,id=BULL_MQ_PRO_NPM_TOKEN,uid=1000 export BULL_MQ_PRO_NPM_TOKEN=$(cat /run/secrets/BULL_MQ_PRO_NPM_TOKEN) && \
    if [ -n "${BULL_MQ_PRO_NPM_TOKEN}" ] ; then echo 'Building with Enterprise Edition of Novu'; rm -f .npmrc ; cp .npmrc-cloud .npmrc ; fi

RUN --mount=type=cache,id=pnpm-store-worker,target=/root/.pnpm-store\
    --mount=type=secret,id=BULL_MQ_PRO_NPM_TOKEN,uid=1000 export BULL_MQ_PRO_NPM_TOKEN=$(cat /run/secrets/BULL_MQ_PRO_NPM_TOKEN) && \
 pnpm install --filter "novuhq" --filter "{${PACKAGE_PATH}}..."\
 --no-frozen-lockfile\
 --unsafe-perm

RUN NODE_ENV=production NX_DAEMON=false pnpm build:worker

WORKDIR /usr/src/app/apps/worker

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

RUN --mount=type=cache,id=pnpm-store-worker,target=/root/.pnpm-store\
    --mount=type=secret,id=BULL_MQ_PRO_NPM_TOKEN,uid=1000 export BULL_MQ_PRO_NPM_TOKEN=$(cat /run/secrets/BULL_MQ_PRO_NPM_TOKEN) && \
 pnpm install --filter "{${PACKAGE_PATH}}..." \
 --no-frozen-lockfile \
 --unsafe-perm

ENV NEW_RELIC_NO_CONFIG_FILE=true

WORKDIR /usr/src/app/apps/worker
CMD [ "pm2-runtime","start", "dist/main.js" ]
