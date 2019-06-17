FROM node:carbon

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install --save
# If you are building your code for production
# RUN npm install --only=production

# Install zip and mysqldump
RUN apt-get update && apt-get install mysql-client -y

COPY server ./server
COPY public_html ./public_html
COPY sample_config ./config

EXPOSE 80
CMD [ "npm", "start" ]