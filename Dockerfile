FROM node:22-bullseye
#     |    └──────────────── Version de Node / Base de Docker
#     └───────────────────── Imagen base ( https://hub.docker.com/_/node )

# Directorio dentro de la imagen
WORKDIR /app

# Copia solo los archivos que cumplan
# con el patron
COPY package*.json ./

# Ejecutas comandos con RUN (RUN usa la
# shell que es el comando por defecto)
RUN npm install

# Despues de instalar copias el resto de
# los archivos (con esto ganas velocidad
# con las layers de docker)
COPY . .

# Si es una app web y necesitas acceso a
# un puerto puedes exponerlo por defecto
# (se puede omitir si habilitas el puerto
# desde los comandos o el compose)
EXPOSE 8080

# Persist roster data and cached sprites across redeploys (mount at runtime):
#   /app/data/uniteRoster.json
#   /app/data/uniteRoster.meta.json
#   /app/data/unite-assets/

# Si usas CMD puedes cambiar el programa
# por defecto de SH por NODE ubicado
# previamente en /app
CMD [ "node", "index.js" ]