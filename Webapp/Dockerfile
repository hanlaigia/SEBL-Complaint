FROM node:20-alpine

WORKDIR /usr/src/app

COPY package.json package-lock.json* ./
# First remove any existing node_modules to ensure a clean install
RUN rm -rf node_modules package-lock.json
# Install dependencies with correct platform and rebuild
RUN npm install --platform=linux
# Force reinstall rollup to ensure correct binaries are present
RUN npm install rollup@latest --force

COPY . .

EXPOSE 4444

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
