# Frontend Dockerfile for ATİS System
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Install dependencies with npm (ensure compatibility)
RUN npm install

# Copy application source
COPY frontend/ .

# Copy shared assets referenced via the @shared alias
COPY shared /shared

# Expose port
EXPOSE 3000

# Start development server with hot reload
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]