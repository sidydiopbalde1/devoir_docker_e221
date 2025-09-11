# Utilise une image de base
FROM node:18-alpine

# Crée un dossier pour l'app
WORKDIR /app

# Copie les fichiers
COPY . .

# Expose le port (optionnel, pour documentation)
EXPOSE 3000

# Lance un petit serveur
CMD ["node", "-e", "console.log('Hello depuis Docker 🚀'); setTimeout(() => {}, 60000)"]