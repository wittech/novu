FROM node:20-alpine
# 更新为国内源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories
# 设置环境变量

# Build dependencies
RUN apk --update --no-cache add make gcc g++ python3 curl
WORKDIR /usr/src/app
RUN npm config set registry https://registry.npmmirror.com --global
RUN npm install -g pnpm@8.12.1 --loglevel notice --force

WORKDIR /usr/src/app

COPY .npmrc .
COPY package.json .

COPY libs/testing ./libs/testing
COPY libs/dal ./libs/dal
COPY libs/shared ./libs/shared
COPY packages/client ./packages/client
COPY packages/node ./packages/node
COPY libs/embed ./libs/embed
COPY packages/notification-center ./packages/notification-center

COPY tsconfig.json .
COPY tsconfig.base.json .

COPY nx.json .
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .

RUN pnpm install
RUN pnpm build

CMD [ "pnpm", "start:docker:embed" ]
