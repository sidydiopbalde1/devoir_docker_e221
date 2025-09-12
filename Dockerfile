# Utilise Node.js 18
FROM node:18

# Dossier de travail
WORKDIR /app

# Copie les fichiers nécessaires pour installer les dépendances
COPY package*.json ./

# Installe les dépendances
RUN npm install --production

# Copie le reste du projet
COPY . .

# Expose le port
EXPOSE 3000

# Commande de démarrage
CMD ["npm", "start"]
