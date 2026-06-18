FROM nginx:alpine

# Copiar el archivo de configuración personalizado de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar todos los archivos del frontend al directorio público de Nginx
# Esto copiará index.html, app.js y cualquier otro recurso que esté en la raíz
COPY . /usr/share/nginx/html/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
