# Utilise une image de base
FROM node:18

# Crée un dossier pour l’app
WORKDIR /app

# Copie les fichiers
COPY . .

# Lance un petit serveur
CMD ["node", "-e", "console.log('Hello depuis Docker 🚀')"]
