# Create a lightweight Express server
FROM node:24.14.0-alpine3.23

WORKDIR /app

# Copy the production build from the workflow
COPY dist /app

# Copy the Express server
COPY server.js /app/server.js

# Copy dependencies from the pipeline
COPY package.json /app/package.json
COPY node_modules /app/node_modules

# Expose port 3000
EXPOSE 3000

# Start Express server
CMD ["node", "/app/server.js"]