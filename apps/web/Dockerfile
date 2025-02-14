# start build stage
FROM node:20-alpine as builder
# 更新为国内源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories
# 设置环境变量

# Build dependencies
RUN apk --update --no-cache add make gcc g++ python3 curl
ENV NX_DAEMON=false

WORKDIR /usr/src/app
RUN npm config set registry https://registry.npmmirror.com --global
# RUN apk add --no-cache bash
RUN npm install -g pnpm@8.12.1 --loglevel notice

COPY .npmrc .
COPY package.json .

COPY apps/web ./apps/web
COPY libs/dal ./libs/dal
COPY libs/testing ./libs/testing
COPY packages/client ./packages/client
COPY libs/shared ./libs/shared
COPY libs/design-system ./libs/design-system
COPY libs/shared-web ./libs/shared-web

COPY packages/notification-center ./packages/notification-center
COPY packages/stateless ./packages/stateless
COPY packages/node ./packages/node

COPY tsconfig.json .
COPY tsconfig.base.json .

COPY nx.json .
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .

RUN --mount=type=cache,id=pnpm-store-web,target=/root/.pnpm-store\
  pnpm install --no-frozen-lockfile

RUN pnpm add @babel/core -w

COPY [".eslintrc.js",".prettierrc",".prettierignore", "./"]

RUN NX_DAEMON=false pnpm build:web
# end build stage

# start production stage
FROM node:20-alpine

WORKDIR /app
# 更新为国内源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories
# 设置环境变量


RUN npm config set registry https://registry.npmmirror.com --global
RUN apk --update --no-cache add bash
RUN npm install -g pnpm@8.12.1 http-server --loglevel notice


WORKDIR /app

COPY  --from=builder /usr/src/app/apps/web/env.sh /app/env.sh
COPY  --from=builder /usr/src/app/apps/web/.env /app/.env

COPY  --from=builder /usr/src/app/apps/web/build /app/build
COPY  --from=builder /usr/src/app/apps/web/public /app/public
COPY  --from=builder /usr/src/app/apps/web/package.json /app/package.json

CMD [ "pnpm", "start:static:build" ]
# end production stage
