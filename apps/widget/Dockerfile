FROM node:20-alpine
# 更新为国内源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories
# 设置环境变量

# Build dependencies
RUN apk --update --no-cache add make gcc g++ python3 curl
ENV NX_DAEMON=false
WORKDIR /usr/src/app
RUN npm config set registry https://registry.npmmirror.com --global
RUN npm install -g pnpm@8.12.1 --loglevel notice
RUN apk add --no-cache bash

WORKDIR /usr/src/app

COPY .npmrc .
COPY package.json .

COPY apps/widget ./apps/widget

COPY libs/dal ./libs/dal
COPY packages/client ./packages/client
COPY libs/testing ./libs/testing
COPY libs/shared ./libs/shared
COPY packages/notification-center ./packages/notification-center
COPY packages/stateless ./packages/stateless
COPY packages/node ./packages/node

COPY tsconfig.json .
COPY tsconfig.base.json .

COPY .eslintrc.js .
COPY .prettierrc .
COPY .prettierignore .
COPY nx.json .
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .

RUN pnpm install
RUN pnpm build

RUN pnpm build:widget

CMD [ "pnpm", "start:static:widget" ]
