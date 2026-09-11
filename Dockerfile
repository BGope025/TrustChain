FROM node:18-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY server/ ./server/
COPY .env ./

EXPOSE 5000

CMD ["npm", "start"]
