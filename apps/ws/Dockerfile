FROM node:20-alpine
# 更新为国内源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories
# 设置环境变量
ENV http_proxy=http://squid_proxy:c6a3e6520dbe5b619525f3b0c70ba5e9@192.168.150.31:13128
ENV https_proxy=http://squid_proxy:c6a3e6520dbe5b619525f3b0c70ba5e9@192.168.150.31:13128
# Build dependencies
RUN apk --update --no-cache add make gcc g++ python3 curl
ARG BULL_MQ_PRO_TOKEN
ENV BULL_MQ_PRO_NPM_TOKEN=$BULL_MQ_PRO_TOKEN
ENV NX_DAEMON=false

WORKDIR /usr/src/app
RUN npm config set registry https://registry.npmmirror.com --global
RUN npm install -g pnpm@8.12.1 --loglevel notice
RUN npm i pm2 nan -g

USER 1000
WORKDIR /usr/src/app

COPY --chown=1000:1000 .npmrc .
COPY --chown=1000:1000 .npmrc-cloud .

COPY --chown=1000:1000 package.json .

COPY --chown=1000:1000 providers ./providers
COPY --chown=1000:1000 apps/ws ./apps/ws
COPY --chown=1000:1000 libs/dal ./libs/dal
COPY --chown=1000:1000 libs/shared ./libs/shared
COPY --chown=1000:1000 libs/testing ./libs/testing
COPY --chown=1000:1000 packages/client ./packages/client
COPY --chown=1000:1000 packages/stateless ./packages/stateless
COPY --chown=1000:1000 packages/node ./packages/node
COPY --chown=1000:1000 packages/application-generic ./packages/application-generic

COPY --chown=1000:1000 ["tsconfig.json","tsconfig.base.json","nx.json","pnpm-workspace.yaml","pnpm-lock.yaml", ".npmrc", "./"]

RUN if [ -n '${BULL_MQ_PRO_NPM_TOKEN}' ] ; then echo 'Building with Enterprise Edition of Novu' ; fi
RUN if [ -n '${BULL_MQ_PRO_NPM_TOKEN}' ]; then rm -f .npmrc ; fi
RUN if [ -n '${BULL_MQ_PRO_NPM_TOKEN}' ]; then cp .npmrc-cloud .npmrc; fi

# https://www.npmjs.com/package/@newrelic/native-metrics
# RUN export NR_NATIVE_METRICS_NO_BUILD=true
RUN pnpm install
RUN pnpm build:ws

RUN if $BULL_MQ_PRO_NPM_TOKEN ; then rm -f .npmrc ; fi

WORKDIR /usr/src/app/apps/ws

RUN cp src/.example.env dist/src/.env
RUN cp src/.env.test dist/src/.env.test
RUN cp src/.env.development dist/src/.env.development
RUN cp src/.env.production dist/src/.env.production

CMD [ "pm2-runtime", "dist/src/main.js" ]
