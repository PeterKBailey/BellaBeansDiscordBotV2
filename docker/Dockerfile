FROM node:18.16.0-alpine as build-image
WORKDIR /usr/src/app
COPY package*.json ./
COPY tsconfig.json ./
COPY ./src ./src
RUN npm ci
RUN npx tsc

FROM node:18.16.0-alpine
WORKDIR /usr/src/app
COPY package*.json ./
COPY --from=build-image /usr/src/app/dist ./dist
RUN chmod +x /usr/src/app/docker-entry.sh
RUN npm ci --production
COPY . .
CMD [ "/usr/src/app/docker-entry.sh" ]