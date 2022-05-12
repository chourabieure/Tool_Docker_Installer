include /etc/nginx/modules-enabled/*.conf;
events{
  worker_connections 1024;
}

http{

  upstream strapi{
    server strapi:1337;
  }

  server{
    listen 80;

    server_name test.matportfolio.ovh
    server_tokens off;

    location /.well-known/acme-challenge/ {
      root /var/www/certbot;
    }

    location / {
      return 301 https://;
    }
  }

  server{
    listen 443 ssl;

    ssl_certificate /etc/nginx/certs/test.matportfolio.ovh.crt;
    ssl_certificate_key /etc/nginx/certs/test.matportfolio.ovh.key;

    server_name test.matportfolio.ovh;

    location / {
      proxy_pass http://strapi/;
    }
  }

}
