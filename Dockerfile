FROM node:18.20.0-alpine3.19 as base

ARG APP_PATH=/app
WORKDIR $APP_PATH

# Pin pnpm (requires Node >=18.12); pnpm 11 bumped the requirement to Node >=22.13
RUN npm install -g pnpm@10.34.5
RUN apk add --no-cache python3 make g++

COPY package.json $APP_PATH/package.json
COPY pnpm-lock.yaml $APP_PATH/pnpm-lock.yaml
COPY pnpm-workspace.yaml $APP_PATH/pnpm-workspace.yaml
COPY packages/server $APP_PATH/packages/server
COPY packages/webapp $APP_PATH/packages/webapp
COPY packages/answer-utils $APP_PATH/packages/answer-utils
COPY packages/embed $APP_PATH/packages/embed
COPY packages/form-renderer $APP_PATH/packages/form-renderer
COPY packages/shared-types-enums $APP_PATH/packages/shared-types-enums
COPY packages/utils $APP_PATH/packages/utils

RUN pnpm install
RUN pnpm build:deps
RUN pnpm build
RUN pnpm --filter ./packages/webapp export

FROM node:18.20.0-alpine3.19 as runner

ARG APP_PATH=/app
WORKDIR $APP_PATH

# Pin pnpm (requires Node >=18.12); pnpm 11 bumped the requirement to Node >=22.13
RUN npm install -g pnpm@10.34.5
RUN apk add --no-cache python3 make g++

COPY --from=base $APP_PATH/package.json ./package.json
COPY --from=base $APP_PATH/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=base $APP_PATH/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=base $APP_PATH/packages/server/dist ./packages/server/dist
COPY --from=base $APP_PATH/packages/server/resources ./packages/server/resources
COPY --from=base $APP_PATH/packages/server/static ./packages/server/static
COPY --from=base $APP_PATH/packages/server/view ./packages/server/view
COPY --from=base $APP_PATH/packages/server/src ./packages/server/src
COPY --from=base $APP_PATH/packages/server/.npmrc ./packages/server/.npmrc
COPY --from=base $APP_PATH/packages/server/tsconfig.json ./packages/server/tsconfig.json
COPY --from=base $APP_PATH/packages/server/package.json ./packages/server/package.json
COPY --from=base $APP_PATH/packages/answer-utils/dist ./packages/answer-utils/dist
COPY --from=base $APP_PATH/packages/answer-utils/package.json ./packages/answer-utils/package.json
COPY --from=base $APP_PATH/packages/shared-types-enums/dist ./packages/shared-types-enums/dist
COPY --from=base $APP_PATH/packages/shared-types-enums/package.json ./packages/shared-types-enums/package.json
COPY --from=base $APP_PATH/packages/utils/dist ./packages/utils/dist
COPY --from=base $APP_PATH/packages/utils/package.json ./packages/utils/package.json
COPY --from=base $APP_PATH/packages/form-renderer/dist ./packages/form-renderer/dist
COPY --from=base $APP_PATH/packages/form-renderer/package.json ./packages/form-renderer/package.json
COPY --from=base $APP_PATH/packages/embed/dist ./packages/embed/dist
COPY --from=base $APP_PATH/packages/embed/package.json ./packages/embed/package.json

RUN pnpm install --prod

EXPOSE 8000
WORKDIR $APP_PATH/packages/server
CMD ["npm", "start"]
