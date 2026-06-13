FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build


FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/dist /tmp/dist

RUN if [ -f /tmp/dist/index.html ]; then \
      cp -r /tmp/dist/* /usr/share/nginx/html/; \
    elif [ -f /tmp/dist/client/index.html ]; then \
      cp -r /tmp/dist/client/* /usr/share/nginx/html/; \
    else \
      echo "ERROR: No index.html found in /app/dist or /app/dist/client" && \
      find /tmp/dist -maxdepth 3 -type f && \
      exit 1; \
    fi

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]