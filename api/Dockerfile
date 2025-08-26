FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY src ./src
COPY openapi.yaml ./openapi.yaml
EXPOSE 8080
CMD ["npm", "start"]