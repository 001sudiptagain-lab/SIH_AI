FROM node:20-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy application files (excluding patterns in .dockerignore)
COPY . .

# Railway exposes dynamic PORT, defaulting to 3000
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
