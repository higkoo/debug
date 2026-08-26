FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production

COPY . .
RUN npm run build

RUN mkdir -p /app/uploads /app/projects

EXPOSE 3001

CMD ["node", "dist/index.js"]