FROM node:20-alpine

WORKDIR /usr/src/app

COPY package.json package-lock.json* ./
RUN npm install --platform=linux

COPY . .

EXPOSE 4444

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
