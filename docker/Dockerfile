FROM node:18.16.0-alpine as build-image
WORKDIR /usr/src/app
COPY package*.json ./
COPY tsconfig.json ./
COPY docker/enable_swap.sh ./
COPY ./src ./src
RUN npm ci
RUN npx tsc

FROM node:18.16.0-alpine
WORKDIR /usr/src/app
COPY package*.json ./
COPY --from=build-image ./usr/src/app/dist ./dist
# enable swapping...
COPY docker/enable_swap.sh ./
RUN chmod +x enable_swap.sh
RUN ./enable_swap.sh
RUN npm ci --production
COPY . .
CMD [ "node", "dist/bot.js" ]