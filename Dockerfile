FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
# Install exactly what package-lock.json pins (fails if it's out of sync with package.json)
RUN npm ci --omit=dev && npm cache clean --force
COPY . .
# App code stays root-owned (read-only to the app); only data/ is writable.
# With the ./data volume mounted, the host folder must be owned by uid 1000 (node).
RUN chown -R node:node /app/data
USER node
EXPOSE 3000
CMD [ "node", "index.js" ]
