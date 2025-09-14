# Backend Dockerfile for Mall POS System
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY . .

# Create necessary directories for data persistence
RUN mkdir -p /app/db /app/uploads /app/images

# Expose the backend port
EXPOSE 3001

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start the backend server
CMD ["npm", "start"]