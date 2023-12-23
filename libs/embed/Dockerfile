FROM node:20-alpine
# 更新为国内源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories
# 设置环境变量
ENV http_proxy=http://squid_proxy:c6a3e6520dbe5b619525f3b0c70ba5e9@192.168.150.31:13128
ENV https_proxy=http://squid_proxy:c6a3e6520dbe5b619525f3b0c70ba5e9@192.168.150.31:13128
# Build dependencies
RUN apk --update --no-cache add make gcc g++ python3 curl
WORKDIR /usr/src/app
RUN npm config set registry https://registry.npmmirror.com --global
RUN npm install -g pnpm@8.12.1 --loglevel notice --force

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

RUN pnpm install --reporter=silent
RUN pnpm build

CMD [ "pnpm", "start:docker:embed" ]
