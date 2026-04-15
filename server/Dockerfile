FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install

# Copy application source
COPY . .

# Expose server port
EXPOSE 5000

# Run in development mode
CMD ["npm", "run", "dev"]
