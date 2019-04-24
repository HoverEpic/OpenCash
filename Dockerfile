FROM node:carbon

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install mysql body-parser --save
# If you are building your code for production
# RUN npm install --only=production

COPY server ./server
COPY public_html ./public_html
COPY config ./config

EXPOSE 80
CMD [ "npm", "start" ]