#!/usr/bin/env node

// https://www.youtube.com/watch?v=_oHByo8tiEY&t=269s

import { exec, spawn } from "child_process";

import chalk from 'chalk';
import inquirer from 'inquirer';
import gradient from 'gradient-string';
import chalkAnimation from 'chalk-animation';
import figlet from 'figlet';
import { createSpinner } from 'nanospinner';
import { exit } from "process";



console.clear();

async function sh(cmd) {
 return new Promise(function (resolve, reject) {
  const spinner = createSpinner('Installing ...\r').start()
  var process = exec(cmd);
  process.stdout.on('data', (data) => {
   console.clear()
   console.log(data)
  })
  process.on('exit', (code) => {
   if (code == 0) {
    console.clear()
    spinner.success('Done')
    resolve(code);
   } else {
    console.clear()
    spinner.error('Something went wrong')
    reject(code);
   }
  })
  process.stderr.on('data', (data) => {
   console.log(data)
  })

 })
}

// INSTALL DOCKER
async function question1() {
 const answer = await inquirer.prompt({
  type: "confirm",
  name: "answer",
  message: "Veux-tu installer DOCKER et DOCKER-COMPOSE ?",
 })

 if (answer.answer) {
  await sh(`ping -c 4 mood.matportfolio.ovh`);
 } else {
  console.log(chalk.red("! ") + chalk.italic("Soit bien sur de les avoir au préalable installé avant de continuer !"))
 }

 return answer
}

// CHOIX BACK-END
async function question2() {
 const answer = await inquirer.prompt({

  type: "list",
  name: "answer",
  message: "Selectionne ton framework back-end :",
  choices: [
   '[JS] Strapi V4',
   { name: '[JS] Express JS', disabled: true },
   { name: "[PHP] Laravel", disabled: true },
  ]
 })
 return answer
}

// INSTALL [JS] Strapi V4
async function question3() {
 const answer = await inquirer.prompt({
  type: "list",
  name: "answer",
  message: "Quel client pour Strapi ?",
  choices: [
   'mysql',
   'mongodb',
   'postgres'
  ]
 })

 // await sh(`npx strapi new strapi --dbclient=${answer.answer} --dbhost=127.0.0.1 --dbport=3306 --dbname=strapi --dbusername=strapi --dbpassword=strapi --no-run`);
 // await sh(
 //  `echo 'FROM node:16
 //    # Installing libvips-dev for sharp compatability
 //    RUN apt-get update
 //    ARG NODE_ENV=development
 //    ENV NODE_ENV=\${NODE_ENV}
 //    WORKDIR /opt/
 //    COPY ./package.json ./
 //    #COPY ./yarn.lock ./
 //    ENV PATH /opt/node_modules/.bin:$PATH
 //    RUN yarn config set network-timeout 600000 -g
 //    RUN yarn install
 //    WORKDIR /opt/app
 //    COPY ./ .
 //    RUN yarn build
 //    EXPOSE 1337
 //    CMD ["yarn", "develop"]
 //    ' >> ./strapi/Dockerfile`);
 // await sh(
 //  `echo '.tmp/
 //        .cache/
 //        .git/
 //        build/
 //        node_modules/
 //        data/
 //        ' >> ./strapi/.dockerignore`);
 // await sh('docker build -t customstrapi:1.0 ./strapi').catch((err) => {
 //  console.log(chalk.red('! Error while building Docker image : '))
 //  exit(1)
 // })
 await sh('rm -rf ./strapi')
 console.log(chalk.green('✔ ' + 'Creating custom strapi container done'))

 return true
}

async function question4() {
 const answer = await inquirer.prompt({
  type: "list",
  name: "answer",
  message: "Selectionne ton web server :",
  choices: [
   'Nginx',
   { name: 'Apache', disabled: true },
   { name: 'Plesk', disabled: true },
   chalk.red('✖ ') + 'Aucun'
  ]
 })

 const answer2 = await inquirer.prompt({
  type: "input",
  name: "answer",
  message: "Quel est ton nom de domaine pour le HTTPS ?"
 })

 if (answer.answer == 'Nginx') {
  await sh('mkdir nginx')
  await sh(`echo "version: '3'
services:
  nginx:
    container_name: nginx
    image: jwilder/nginx-proxy:alpine
    ports:
      - \"80:80\"
      - \"443:443\"
    volumes:
      - ./nginx/conf.d:/etc/nginx/nginx.conf
      - /var/run/docker.sock:/tmp/docker.sock:ro
      - ./certs:/etc/nginx/certs
    restart: always
    networks:
      - network

volumes:
  nginx_certs:

networks:
  network:
    name: back-network
    external: true
  " > ./nginx/docker-compose.yml`)
  await sh(`echo "include /etc/nginx/modules-enabled/*.conf;
events{
  worker_connections 1024;
}

http{

  upstream strapi{
    server strapi:1337;
  }

  server{
    listen 80;

    server_name ${answer2.answer}
    server_tokens off;

    location /.well-known/acme-challenge/ {
      root /var/www/certbot;
    }

    location / {
      return 301 https://$host$request_uri;
    }
  }

  server{
    listen 443 ssl;

    ssl_certificate /etc/nginx/certs/${answer2.answer}.crt;
    ssl_certificate_key /etc/nginx/certs/${answer2.answer}.key;

    server_name ${answer2.answer};

    location / {
      proxy_pass http://strapi/;
    }
  }

}" > ./nginx/conf.d`)
  console.log(chalk.green('✔ ' + 'Intalling Nginx files done'))
 }

 await sh('mkdir backend')
 await sh(`echo "version: '3'
services:
 strapi:
   image: customstrapi:1.0
   container_name: strapi
   environment:
     DATABASE_CLIENT: mysql
     DATABASE_HOST: mysql
     DATABASE_PORT: 3306
     DATABASE_NAME: strapi
     DATABASE_USERNAME: strapi
     DATABASE_PASSWORD: strapi
     DATABASE_SSL: 'false'
     VIRTUAL_PORT: 1337
     VIRTUAL_HOST: ${answer2.answer}
   volumes:
     # - ./strapi/config:/opt/app/config
     - ./strapi/src/uploads:/opt/app/src/uploads
     # - ./strapi/package.json:/opt/package.json
     # - ./strapi/.env:/opt/app/.env
   ports:
     - '1337:1337'
   networks:
     - back-network
   depends_on:
     - mysql

 mysql:
   image: mysql
   command: mysqld --default-authentication-plugin=mysql_native_password
   volumes:
     - ./data:/var/lib/mysql
   environment:
     MYSQL_ROOT_PASSWORD: strapi
     MYSQL_DATABASE: strapi
     MYSQL_USER: strapi
     MYSQL_PASSWORD: strapi
   networks:
     - back-network

networks:
 back-network:
   name: back-network
   driver: bridge
       
 " > ./backend/docker-compose.yml`)

 console.log(chalk.green('✔ ' + 'Intalling backend files done'))




 return true
}

// async function question5() {
//  const answer = await inquirer.prompt({
//   type: "list",
//   name: "answer",
//   message: "Selectionne ton web server :",
//   choices: [
//    'Nginx',
//    { name: 'Apache', disabled: true },
//    { name: 'Plesk', disabled: true },
//    chalk.red('✖ ') + 'Aucun'
//   ]
//  })
// }

const home_message = 'Mat - Installer - CMS'
figlet(home_message, async (err, data) => {
 console.log(gradient.pastel.multiline(data))
 console.log('> ' + gradient.mind('Bienvenue sur Mat-Installer pour Headless CMS !') + chalk.bold(chalk.blue(' >> With Docker')))

 // INSTALL DOCKER
 await question1()

 // CHOIX BACKEND
 const response = await question2()
 if (response.answer == '[JS] Strapi V4') {
  // Install Strapi
  await question3()
 }

 // Install nginx files and backend files
 await question4()
 // await question5()

})




