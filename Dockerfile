FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml tsconfig.json ./

RUN pnpm install

COPY . .

RUN pnpm run build

EXPOSE 5000

CMD ["pnpm", "start"]
